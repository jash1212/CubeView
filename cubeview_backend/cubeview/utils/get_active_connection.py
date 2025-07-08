# cubeview/utils/get_active_connection.py

def get_active_connection(user):
    from ..models import UserDatabaseConnection

    db_conn = UserDatabaseConnection.objects.filter(user=user, is_active=True).first()
    if not db_conn:
        raise Exception("No active DB connection found for user.")
    return db_conn
