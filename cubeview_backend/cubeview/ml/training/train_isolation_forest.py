# ml/training/train_isolation_forest.py

import os
import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest
from cubeview.models import MetricHistory

def retrain_model(min_records=20):
    records = (
        MetricHistory.objects
        .filter(metric_type__in=["null_percent", "volume", "schema_change"])
        .order_by("table_id", "metric_type", "-timestamp")  # fix field name
    )

    data = {}
    for r in records:
        tid = r.table_id
        if tid not in data:
            data[tid] = {}
        if r.metric_type not in data[tid]:
            data[tid][r.metric_type] = r.value

    df = pd.DataFrame.from_dict(data, orient="index").dropna()

    if len(df) < min_records:
        print(f"⚠️ Not enough data to train. Found: {len(df)} records.")
        return False

    model = IsolationForest(contamination=0.1, random_state=42)
    model.fit(df)

    path = os.path.join("ml", "models", "isolation_forest_cv.pkl")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(model, path)

    print(f"✅ Model retrained and saved to: {path}")
    return True
