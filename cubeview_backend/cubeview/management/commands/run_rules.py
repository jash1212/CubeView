import psycopg2
from psycopg2 import sql
from django.core.management.base import BaseCommand
from django.utils import timezone
from ...models import DataQualityRule, RuleExecutionHistory, Incident, UserDatabaseConnection

class Command(BaseCommand):
    help = "Run data quality rules based on schedule"

    def add_arguments(self, parser):
        parser.add_argument("--frequency", type=str, help="daily or hourly", default="daily")

    def handle(self, *args, **options):
        frequency = options["frequency"]
        rules = DataQualityRule.objects.filter(schedule=frequency)

        for rule in rules:
            user = rule.user
            db_conn = UserDatabaseConnection.objects.filter(user=user, is_active=True).first()
            if not db_conn:
                self.stdout.write(self.style.WARNING(f"No active DB for user {user.username}"))
                continue

            try:
                conn = psycopg2.connect(
                    host=db_conn.host,
                    port=db_conn.port,
                    user=db_conn.username,
                    password=db_conn.password,
                    dbname=db_conn.database_name,
                )
                cursor = conn.cursor()
                cursor.execute(rule.rule_logic)
                result = cursor.fetchone()
                failed_rows = int(result[0]) if result else 0

                status = "pass" if failed_rows == 0 else "fail"

                # Save execution history
                RuleExecutionHistory.objects.create(
                    rule=rule,
                    status=status,
                    failed_rows=failed_rows
                )

                # Create incident if failed and critical
                if status == "fail" and rule.severity == "critical":
                    Incident.objects.create(
                        title=f"Rule Failed: {rule.natural_language or rule.rule_type}",
                        description=f"{failed_rows} rows failed for rule on {rule.table.name}.{rule.column}",
                        related_table=rule.table,
                        incident_type="Custom",
                        severity="high"
                    )

                self.stdout.write(self.style.SUCCESS(
                    f"Rule [{rule.id}] {status.upper()} - {failed_rows} failed rows."
                ))

                cursor.close()
                conn.close()

            except Exception as e:
                self.stdout.write(self.style.ERROR(
                    f"Error running rule {rule.id}: {e}"
                ))
