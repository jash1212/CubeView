from django.core.management.base import BaseCommand
# cubeview/management/commands/retrain_anomaly_model.py
from cubeview.ml.training.train_isolation_forest import retrain_model


class Command(BaseCommand):
    help = "Retrain the ML anomaly detection model"

    def handle(self, *args, **kwargs):
        success = retrain_model()
        if success:
            self.stdout.write(self.style.SUCCESS("✅ Model retrained and saved."))
        else:
            self.stdout.write(self.style.WARNING("⚠️ Not enough data to retrain."))
