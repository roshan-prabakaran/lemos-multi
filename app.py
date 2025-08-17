from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3
import json
from datetime import datetime, timedelta
import threading
import time
from services.database import DatabaseManager
from services.sms_service import SMSService
from ml.forecasting import ForecastingModel
from ingestion.data_processor import DataProcessor
import os
app = Flask(__name__)
CORS(app)

# Initialize services
db_manager = DatabaseManager()
sms_service = SMSService()
forecasting_model = ForecastingModel()
data_processor = DataProcessor()

# Global variables for real-time monitoring
latest_readings = {}
alert_thresholds = {
    'methane': 1000,  # ppm
    'co': 50,  # ppm
    'temperature': 35,  # celsius
    'humidity': 80  # percentage
}


@app.route('/')
def dashboard():
    """Main dashboard page"""
    return render_template('dashboard.html')


@app.route('/api/readings', methods=['POST'])
def receive_readings():
    """Receive sensor readings from Arduino"""
    try:
        data = request.get_json()

        print(f"Received data: {data}")

        # Validate required fields
        required_fields = ['area_id', 'methane', 'co', 'temperature', 'humidity', 'water_level']
        missing_fields = [field for field in required_fields if field not in data]

        if missing_fields:
            print(f"Missing required fields: {missing_fields}")
            return jsonify({'error': f'Missing required fields: {missing_fields}'}), 400

        # Process and store data
        processed_data = data_processor.process_reading(data)
        db_manager.store_reading(processed_data)

        # Update latest readings
        latest_readings[data['area_id']] = processed_data

        print(f"Successfully stored reading for area {data['area_id']}")

        # Check for alerts
        check_alerts(processed_data)

        return jsonify({'status': 'success', 'message': 'Reading stored successfully'})

    except Exception as e:
        print(f"Error processing reading: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/readings')
def get_readings():
    """Get recent sensor readings"""
    try:
        hours = request.args.get('hours', 24, type=int)
        area_id = request.args.get('area_id')

        readings = db_manager.get_readings(hours=hours, area_id=area_id)
        return jsonify(readings)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/forecast')
def get_forecast():
    """Get ML forecast for gas levels"""
    try:
        area_id = request.args.get('area_id', type=int)
        hours = request.args.get('hours', 48, type=int)

        if not area_id:
            return jsonify({'error': 'area_id is required'}), 400

        # Get historical data for forecasting
        historical_data = db_manager.get_readings(hours=168, area_id=area_id)  # 1 week

        if len(historical_data) < 10:
            return jsonify({'error': 'Insufficient historical data for forecasting'}), 400

        # Generate forecast
        forecast = forecasting_model.predict(historical_data, hours=hours)

        return jsonify(forecast)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/alerts')
def get_alerts():
    """Get recent alerts"""
    try:
        hours = request.args.get('hours', 24, type=int)
        alerts = db_manager.get_alerts(hours=hours)
        return jsonify(alerts)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/thresholds', methods=['GET', 'POST'])
def manage_thresholds():
    """Get or update alert thresholds"""
    global alert_thresholds

    if request.method == 'GET':
        return jsonify(alert_thresholds)

    elif request.method == 'POST':
        try:
            new_thresholds = request.get_json()
            alert_thresholds.update(new_thresholds)
            return jsonify({'status': 'success', 'thresholds': alert_thresholds})

        except Exception as e:
            return jsonify({'error': str(e)}), 500


@app.route('/api/status')
def system_status():
    """Get system status and latest readings"""
    try:
        status = {
            'server_time': datetime.now().isoformat(),
            'latest_readings': latest_readings,
            'database_connected': True,
            'areas_monitored': list(latest_readings.keys())
        }
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def check_alerts(reading):
    """Check if reading exceeds thresholds and send alerts"""
    alerts = []

    # Check methane levels
    if reading['methane'] > alert_thresholds['methane']:
        alert = {
            'type': 'methane',
            'area_id': reading['area_id'],
            'value': reading['methane'],
            'threshold': alert_thresholds['methane'],
            'severity': 'high' if reading['methane'] > alert_thresholds['methane'] * 1.5 else 'medium',
            'timestamp': reading['timestamp']
        }
        alerts.append(alert)

    # Check CO levels
    if reading['co'] > alert_thresholds['co']:
        alert = {
            'type': 'co',
            'area_id': reading['area_id'],
            'value': reading['co'],
            'threshold': alert_thresholds['co'],
            'severity': 'high' if reading['co'] > alert_thresholds['co'] * 1.5 else 'medium',
            'timestamp': reading['timestamp']
        }
        alerts.append(alert)

    # Store alerts and send notifications
    for alert in alerts:
        db_manager.store_alert(alert)

        message = f"LEMOS ALERT: {alert['type'].upper()} level {alert['value']} exceeds threshold {alert['threshold']} in Area {alert['area_id']}"
        sms_service.send_alert(message, alert['severity'], alert['area_id'])


def background_monitoring():
    """Background task for continuous monitoring and forecasting"""
    while True:
        try:
            # Run forecasting for all areas every hour
            for area_id in [1, 2, 3]:
                historical_data = db_manager.get_readings(hours=168, area_id=area_id)
                if len(historical_data) >= 10:
                    forecast = forecasting_model.predict(historical_data, hours=48)

                    # Check if forecast predicts dangerous levels
                    for point in forecast:
                        if (point['methane'] > alert_thresholds['methane'] or
                                point['co'] > alert_thresholds['co']):
                            alert = {
                                'type': 'forecast_warning',
                                'area_id': area_id,
                                'predicted_time': point['timestamp'],
                                'predicted_values': {
                                    'methane': point['methane'],
                                    'co': point['co']
                                },
                                'timestamp': datetime.now().isoformat()
                            }

                            db_manager.store_alert(alert)
                            message = f"LEMOS FORECAST WARNING: Dangerous levels predicted for Area {area_id} at {point['timestamp']}"
                            sms_service.send_alert(message, 'medium', area_id)

            time.sleep(3600)  # Run every hour

        except Exception as e:
            print(f"Background monitoring error: {e}")
            time.sleep(300)  # Wait 5 minutes before retrying




    
if __name__ == '__main__':
    # Initialize database
    db_manager.init_database()

    # Start background monitoring thread
    monitoring_thread = threading.Thread(target=background_monitoring, daemon=True)
    monitoring_thread.start()

    # Run Flask app
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)


