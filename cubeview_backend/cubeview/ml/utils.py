import os
import joblib
import pandas as pd

# Load model once (assumes model is saved in 'cv_ml/models/')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'isolation_forest_cv.pkl')
model = joblib.load(MODEL_PATH)

def detect_anomalies(null_percent, volume, schema_change):
    """Returns True if anomaly is detected, else False"""
    X = pd.DataFrame([{
        "null_percent": null_percent,
        "volume": volume,
        "schema_change": schema_change
    }])
    result = model.predict(X)
    return result[0] == -1
