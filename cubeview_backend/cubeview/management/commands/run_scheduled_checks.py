from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from cubeview.models import DataQualityCheck, DataTable
from cubeview.utils.check_data_quality import run_data_quality_checks
import datetime

User = get_user_model()

class Command(BaseCommand):
    help = "Run data quality checks for users based on check frequency"

    def handle(self, *args, **kwargs):
        now = timezone.now()

        for user in User.objects.all():
            freq = getattr(user, "check_frequency", "daily")

            # Get latest check
            latest_check = DataQualityCheck.objects.filter(table__owner=user).order_by("-run_time").first()

            should_run = False

            if not latest_check:
                should_run = True
            else:
                time_diff = now - latest_check.run_time

                if freq == "minutely" and time_diff.total_seconds() > 60:
                    should_run = True
                elif freq == "hourly" and time_diff.total_seconds() > 3600:
                    should_run = True
                elif freq == "daily" and time_diff.total_seconds() > 86400:
                    should_run = True

            if should_run:
                self.stdout.write(f"▶️ Running checks for user: {user.username} ({freq})")
                try:
                    run_data_quality_checks(user)
                    self.stdout.write(self.style.SUCCESS(f"✅ Checks completed for {user.username}"))
                except Exception as e:
                    self.stderr.write(f"❌ Failed for {user.username}: {str(e)}")
