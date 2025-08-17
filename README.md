# LEMOS Multi-Area Forecasting and Alerting System

A comprehensive IoT-based environmental monitoring system for landfill gas detection and forecasting.

## Features

- **Multi-sensor monitoring**: MQ-4 (methane), MQ-7 (CO), DHT11 (temp/humidity), ultrasonic, soil moisture, vibration, IR
- **Real-time data collection** via ESP32 with WiFi connectivity
- **Machine learning forecasting** for 48-hour gas level predictions
- **Multi-area SMS alerting** via Twilio integration
- **Web dashboard** with real-time charts and monitoring
- **SQLite database** for data storage and historical analysis

## Hardware Setup

### ESP32 Pin Configuration
| Sensor/Module | Quantity | ESP32 Pin | Notes |
|---------------|----------|-----------|-------|
| MQ-4 Gas Sensors | 3 | GPIO34, 35, 32 | Analog pins |
| MQ-7 Gas Sensors | 3 | GPIO33, 36, 39 | Analog pins |
| DHT11 (Temp+Humidity) | 3 | GPIO4, 16, 17 | Digital pins |
| Ultrasonic (HC-SR04) | 1 | TRIG→GPIO25, ECHO→GPIO26 | Digital |
| Soil Moisture | 1 | GPIO27 | Analog |
| Vibration Sensor | 1 | GPIO14 | Digital |
| IR Sensor | 1 | GPIO13 | Digital |
| LCD (I2C) | 1 | SDA→GPIO21, SCL→GPIO22 | I2C |
| Buzzer | 1 | GPIO23 | PWM |

## Software Installation

### 1. Backend Setup
\`\`\`bash
pip install -r requirements.txt
python app.py
\`\`\`

### 2. Generate Sample Data (for testing)
\`\`\`bash
python scripts/generate_sample_data.py
\`\`\`

### 3. Arduino Setup
1. Install required libraries:
   - WiFi
   - HTTPClient
   - ArduinoJson
   - DHT sensor library
   - LiquidCrystal_I2C

2. Update WiFi credentials in `arduino/lemos_esp32.ino`
3. Upload to ESP32

### 4. Environment Variables
Create a `.env` file:
\`\`\`
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
\`\`\`

## API Endpoints

- `POST /api/data` - Receive sensor data from ESP32
- `GET /api/current/<area_id>` - Get current readings
- `GET /api/history/<area_id>?hours=24` - Get historical data
- `GET /api/forecast/<area_id>` - Get 48-hour forecast

## Alert Configuration

### Thresholds
- **Methane (MQ-4)**: >1000 ppm (danger), >800 ppm (warning)
- **Carbon Monoxide (MQ-7)**: >50 ppm (danger), >30 ppm (warning)
- **Temperature**: >45°C (danger), >35°C (warning)

### SMS Numbers (configure in app.py)
- Area 1: +1234567890
- Area 2: +1234567891
- Area 3: +1234567892

## Machine Learning

The system uses Random Forest models to predict gas concentrations:
- **Features**: Time-based, environmental conditions, lag values, rolling averages
- **Targets**: Methane and CO concentrations
- **Training**: Automatic retraining with new data
- **Forecast**: 48-hour predictions with confidence scores

## Deployment

### Local Development
\`\`\`bash
python app.py
\`\`\`

### Production (Render/Heroku)
1. Push to GitHub
2. Connect to Render/Heroku
3. Set environment variables
4. Deploy using `Procfile`

## Dashboard Features

- **Real-time monitoring** for all 3 areas
- **Interactive charts** for gas levels and environmental conditions
- **48-hour forecasting** with ML predictions
- **Alert management** with visual indicators
- **System status** monitoring
- **Mobile responsive** design

## Troubleshooting

### ESP32 Issues
- Check WiFi credentials
- Verify pin connections
- Monitor serial output for errors
- Ensure server URL is accessible

### Backend Issues
- Check database permissions
- Verify Twilio credentials
- Monitor Flask logs
- Ensure all dependencies installed

### Dashboard Issues
- Check browser console for errors
- Verify API endpoints are responding
- Clear browser cache
- Check network connectivity

## License

MIT License - see LICENSE file for details.
