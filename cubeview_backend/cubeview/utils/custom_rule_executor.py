import psycopg2
from ..models import DataQualityRule, RuleExecutionHistory, Incident, UserDatabaseConnection
from datetime import datetime

def execute_custom_rules(user):
    # Get DB connection for the user
    db_conn = UserDatabaseConnection.objects.filter(user=user).first()
    if not db_conn:
        return

    try:
        conn = psycopg2.connect(
            host=db_conn.host,
            port=db_conn.port,
            user=db_conn.username,
            password=db_conn.password,
            dbname=db_conn.database_name
        )
        cursor = conn.cursor()

        rules = DataQualityRule.objects.filter(user=user)
        for rule in rules:
            try:
                cursor.execute(rule.sql)
                result = cursor.fetchone()
                passed = result and result[0]  # Expecting result like [(True,)] or [(False,)]

                # Log execution history
                RuleExecutionHistory.objects.create(
                    rule=rule,
                    executed_at=datetime.now(),
                    passed=passed
                )

                # Create incident if failed
                if not passed:
                    Incident.objects.create(
                        user=user,
                        table=rule.table,
                        incident_type="Custom",
                        severity="high",
                        description=f"Rule failed: {rule.description}"
                    )

            except Exception as e:
                RuleExecutionHistory.objects.create(
                    rule=rule,
                    executed_at=datetime.now(),
                    passed=False,
                    notes=str(e)
                )
                Incident.objects.create(
                    user=user,
                    table=rule.table,
                    incident_type="Custom",
                    severity="high",
                    description=f"Rule execution error: {e}"
                )

        cursor.close()
        conn.close()

    except Exception as err:
        print(f"DB Error in execute_custom_rules: {err}")
