from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth import get_user_model



class User(AbstractUser):
    email = models.EmailField(unique=True)
    check_frequency = models.CharField(
        max_length=20,
        choices=[("minutely", "Every Minute"), ("hourly", "Every Hour"), ("daily", "Every Day")],
        default="daily"
    )



class DataTable(models.Model):
    name = models.CharField(max_length=100)
    source = models.CharField(max_length=100)  # e.g., Snowflake, PostgreSQL
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)


class DataTableTag(models.Model):
    table = models.ForeignKey(DataTable, on_delete=models.CASCADE)
    tag = models.ForeignKey(Tag, on_delete=models.CASCADE)


class Incident(models.Model):
    STATUS_CHOICES = [
        ("ongoing", "Ongoing"),
        ("resolved", "Resolved"),
    ]

    title = models.CharField(max_length=100)
    description = models.TextField()
    related_table = models.ForeignKey(DataTable, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ongoing")
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title


class DataQualityCheck(models.Model):
    table = models.ForeignKey(DataTable, on_delete=models.CASCADE)
    run_time = models.DateTimeField(auto_now_add=True)
    passed_percentage = models.FloatField()  # e.g., 96.5%

    def __str__(self):
        return f"{self.table.name} - {self.run_time}"


class ExportedMetadata(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    table = models.ForeignKey(DataTable, on_delete=models.CASCADE)
    format = models.CharField(max_length=10)  # CSV, JSON
    timestamp = models.DateTimeField(auto_now_add=True)


class ColumnMetadata(models.Model):
    table = models.ForeignKey(
        DataTable, on_delete=models.CASCADE, related_name="columns"
    )
    name = models.CharField(max_length=255)
    data_type = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.table.name}.{self.name} ({self.data_type})"

FREQUENCY_CHOICES = [
    ("minutely", "Every Minute"),
    ("hourly", "Every Hour"),
    ("daily", "Every Day"),
]

# models.py
class UserDatabaseConnection(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    name = models.CharField(max_length=100)  # e.g., "NeonDB 1"
    db_type = models.CharField(max_length=50)  # e.g., 'PostgreSQL', 'NeonDB'
    host = models.CharField(max_length=255)
    port = models.IntegerField()
    username = models.CharField(max_length=100)
    password = models.CharField(max_length=100)
    database_name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.db_type})"

