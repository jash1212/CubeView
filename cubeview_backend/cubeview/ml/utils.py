# cv_ml/utils/ml_model.py

import os
import joblib
import pandas as pd

_model = None  # Singleton pattern

def load_model():
    global _model
    if _model is None:
        model_path = os.path.join(os.path.dirname(__file__), 'models', 'isolation_forest_cv.pkl')
        if not os.path.exists(model_path):
            raise FileNotFoundError("Isolation Forest model not found at expected path.")
        _model = joblib.load(model_path)
    return _model

def detect_anomalies(null_percent, volume, schema_change):
    model = load_model()
    X = pd.DataFrame([{
        "null_percent": null_percent,
        "volume": volume,
        "schema_change": schema_change
    }])
    result = model.predict(X)
    return result[0] == -1
