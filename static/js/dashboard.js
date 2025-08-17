class LEMOSDashboard {
  constructor() {
    this.currentArea = "1"
    this.charts = {}
    this.lastUpdate = null
    this.updateInterval = null

    this.init()
  }

  init() {
    this.initCharts()
    this.startDataUpdates()
    this.checkSystemStatus()

    // Update every 30 seconds
    this.updateInterval = setInterval(() => {
      this.updateCurrentData()
      this.updateForecast()
    }, 30000)
  }

  initCharts() {
    // Gas Levels Chart
    const gasCtx = document.getElementById("gasChart").getContext("2d")
    this.charts.gas = new window.Chart(gasCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Methane (ppm)",
            data: [],
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231, 76, 60, 0.1)",
            tension: 0.4,
          },
          {
            label: "Carbon Monoxide (ppm)",
            data: [],
            borderColor: "#f39c12",
            backgroundColor: "rgba(243, 156, 18, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Concentration (ppm)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Time",
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    })

    // Environmental Chart
    const envCtx = document.getElementById("envChart").getContext("2d")
    this.charts.env = new window.Chart(envCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Temperature (°C)",
            data: [],
            borderColor: "#3498db",
            backgroundColor: "rgba(52, 152, 219, 0.1)",
            yAxisID: "y",
          },
          {
            label: "Humidity (%)",
            data: [],
            borderColor: "#2ecc71",
            backgroundColor: "rgba(46, 204, 113, 0.1)",
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: "linear",
            display: true,
            position: "left",
            title: {
              display: true,
              text: "Temperature (°C)",
            },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            title: {
              display: true,
              text: "Humidity (%)",
            },
            grid: {
              drawOnChartArea: false,
            },
          },
          x: {
            title: {
              display: true,
              text: "Time",
            },
          },
        },
      },
    })

    // Forecast Chart
    const forecastCtx = document.getElementById("forecastChart").getContext("2d")
    this.charts.forecast = new window.Chart(forecastCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Predicted Methane",
            data: [],
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231, 76, 60, 0.1)",
            borderDash: [5, 5],
            tension: 0.4,
          },
          {
            label: "Predicted CO",
            data: [],
            borderColor: "#f39c12",
            backgroundColor: "rgba(243, 156, 18, 0.1)",
            borderDash: [5, 5],
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Predicted Concentration (ppm)",
            },
          },
          x: {
            title: {
              display: true,
              text: "Future Time",
            },
          },
        },
      },
    })
  }

  async updateCurrentData() {
    try {
      const response = await fetch(`/api/current/${this.currentArea}`)
      const data = await response.json()

      if (data && Object.keys(data).length > 0) {
        this.updateReadings(data)
        this.updateConnectionStatus(true)
        this.lastUpdate = new Date()
        document.getElementById("last-update").textContent = `Last Update: ${this.lastUpdate.toLocaleTimeString()}`
      }

      // Update historical charts
      await this.updateHistoricalCharts()
    } catch (error) {
      console.error("Error updating current data:", error)
      this.updateConnectionStatus(false)
    }
  }

  updateReadings(data) {
    // Update current readings
    document.getElementById("mq4-value").textContent = `${(data.mq4_avg || 0).toFixed(1)} ppm`
    document.getElementById("mq7-value").textContent = `${(data.mq7_avg || 0).toFixed(1)} ppm`
    document.getElementById("temp-value").textContent = `${(data.temperature || 0).toFixed(1)} °C`
    document.getElementById("humidity-value").textContent = `${(data.humidity || 0).toFixed(1)} %`
    document.getElementById("distance-value").textContent = `${(data.ultrasonic_distance || 0).toFixed(1)} cm`
    document.getElementById("soil-value").textContent = `${data.soil_moisture || 0}`

    // Update alert status based on readings
    this.updateAlertStatus(data)

    // Apply warning/danger classes
    this.applyReadingClasses(data)
  }

  applyReadingClasses(data) {
    const mq4Element = document.getElementById("mq4-value")
    const mq7Element = document.getElementById("mq7-value")
    const tempElement = document.getElementById("temp-value")

    // Reset classes
    ;[mq4Element, mq7Element, tempElement].forEach((el) => {
      el.classList.remove("warning", "danger")
    })

    // Apply warning/danger classes
    if (data.mq4_avg > 800) {
      mq4Element.classList.add(data.mq4_avg > 1000 ? "danger" : "warning")
    }

    if (data.mq7_avg > 30) {
      mq7Element.classList.add(data.mq7_avg > 50 ? "danger" : "warning")
    }

    if (data.temperature > 35) {
      tempElement.classList.add(data.temperature > 45 ? "danger" : "warning")
    }
  }

  updateAlertStatus(data) {
    const alertContainer = document.getElementById("alert-container")
    const alerts = []

    // Check for alert conditions
    if (data.mq4_avg > 1000) {
      alerts.push({
        type: "danger",
        icon: "🚨",
        text: `High methane detected: ${data.mq4_avg.toFixed(1)} ppm`,
      })
    } else if (data.mq4_avg > 800) {
      alerts.push({
        type: "warning",
        icon: "⚠️",
        text: `Elevated methane: ${data.mq4_avg.toFixed(1)} ppm`,
      })
    }

    if (data.mq7_avg > 50) {
      alerts.push({
        type: "danger",
        icon: "🚨",
        text: `High CO detected: ${data.mq7_avg.toFixed(1)} ppm`,
      })
    } else if (data.mq7_avg > 30) {
      alerts.push({
        type: "warning",
        icon: "⚠️",
        text: `Elevated CO: ${data.mq7_avg.toFixed(1)} ppm`,
      })
    }

    if (data.temperature > 45) {
      alerts.push({
        type: "danger",
        icon: "🌡️",
        text: `High temperature: ${data.temperature.toFixed(1)}°C`,
      })
    }

    // Update alert display
    if (alerts.length === 0) {
      alertContainer.innerHTML = `
                <div class="alert-item safe">
                    <span class="alert-icon">✅</span>
                    <span class="alert-text">All systems normal</span>
                </div>
            `
    } else {
      alertContainer.innerHTML = alerts
        .map(
          (alert) => `
                <div class="alert-item ${alert.type}">
                    <span class="alert-icon">${alert.icon}</span>
                    <span class="alert-text">${alert.text}</span>
                </div>
            `,
        )
        .join("")
    }
  }

  async updateHistoricalCharts() {
    try {
      const response = await fetch(`/api/history/${this.currentArea}?hours=24`)
      const data = await response.json()

      if (data && data.length > 0) {
        // Prepare data for charts
        const labels = data.map((d) => new Date(d.timestamp).toLocaleTimeString())
        const mq4Data = data.map((d) => d.mq4_avg || 0)
        const mq7Data = data.map((d) => d.mq7_avg || 0)
        const tempData = data.map((d) => d.temperature || 0)
        const humidityData = data.map((d) => d.humidity || 0)

        // Update gas chart
        this.charts.gas.data.labels = labels
        this.charts.gas.data.datasets[0].data = mq4Data
        this.charts.gas.data.datasets[1].data = mq7Data
        this.charts.gas.update()

        // Update environmental chart
        this.charts.env.data.labels = labels
        this.charts.env.data.datasets[0].data = tempData
        this.charts.env.data.datasets[1].data = humidityData
        this.charts.env.update()
      }
    } catch (error) {
      console.error("Error updating historical charts:", error)
    }
  }

  async updateForecast() {
    try {
      const response = await fetch(`/api/forecast/${this.currentArea}`)
      const data = await response.json()

      if (data && data.forecasts) {
        const labels = data.forecasts.map((f) => new Date(f.timestamp).toLocaleString())
        const mq4Forecast = data.forecasts.map((f) => f.mq4_avg)
        const mq7Forecast = data.forecasts.map((f) => f.mq7_avg)

        this.charts.forecast.data.labels = labels
        this.charts.forecast.data.datasets[0].data = mq4Forecast
        this.charts.forecast.data.datasets[1].data = mq7Forecast
        this.charts.forecast.update()
      }
    } catch (error) {
      console.error("Error updating forecast:", error)
    }
  }

  updateConnectionStatus(connected) {
    const statusElement = document.getElementById("connection-status")
    const esp32Status = document.getElementById("esp32-status")

    if (connected) {
      statusElement.textContent = "🟢 Connected"
      statusElement.style.color = "#27ae60"
      esp32Status.textContent = "🟢 Online"
    } else {
      statusElement.textContent = "🔴 Disconnected"
      statusElement.style.color = "#e74c3c"
      esp32Status.textContent = "🔴 Offline"
    }
  }

  async checkSystemStatus() {
    // This would check various system components
    // For now, we'll simulate the status
    document.getElementById("db-status").textContent = "🟢 Online"
    document.getElementById("sms-status").textContent = "🟢 Ready"
    document.getElementById("ml-status").textContent = "🟢 Active"
  }

  startDataUpdates() {
    // Initial data load
    this.updateCurrentData()
    this.updateForecast()
  }
}

// Area switching function
function switchArea(areaId) {
  // Update active tab
  document.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.remove("active")
  })
  event.target.classList.add("active")

  // Update dashboard
  if (window.dashboard) {
    window.dashboard.currentArea = areaId
    window.dashboard.updateCurrentData()
    window.dashboard.updateForecast()
  }
}

// Initialize dashboard when page loads
document.addEventListener("DOMContentLoaded", () => {
  window.dashboard = new LEMOSDashboard()
})
