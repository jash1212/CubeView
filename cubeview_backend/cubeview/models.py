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
    user = models.ForeignKey(User, on_delete=models.CASCADE)  # renamed from owner to user
    description = models.TextField(blank=True, null=True)
    connection = models.ForeignKey(
    "UserDatabaseConnection",
    on_delete=models.CASCADE,
    null=True,
    blank=True,
    related_name="tables"
)
    null_percent = models.FloatField(default=0.0)
    row_count = models.IntegerField(default=0)
    schema_changed_recently = models.BooleanField(default=False)


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
    type = models.CharField(max_length=100, blank=True, null=True)

    title = models.CharField(max_length=100)
    description = models.TextField()
    related_table = models.ForeignKey(DataTable, on_delete=models.CASCADE)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default="ongoing")
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    incident_type = models.CharField(max_length=50, default="Custom") 
    severity = models.CharField(
        max_length=20,
        choices=[
            ("low", "Low"),
            ("medium", "Medium"),
            ("high", "High")
        ],
        default="medium",
        blank=True,
        null=True
    )

    def __str__(self):
        return self.title


class DataQualityCheck(models.Model):
    table = models.ForeignKey(DataTable, on_delete=models.CASCADE, related_name="data_quality_checks")
    run_time = models.DateTimeField(auto_now_add=True)
    passed_percentage = models.FloatField()  # e.g., 96.5%

    def __str__(self):
        return f"{self.table.name} - {self.run_time}"


class ExportedMetadata(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    table = models.ForeignKey(DataTable, on_delete=models.CASCADE)
    format = models.CharField(max_length=10)  # CSV, JSON
    timestamp = models.DateTimeField(auto_now_add=True)
    ai_description = models.TextField(blank=True, null=True)


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


class FieldMetric(models.Model):
    table = models.ForeignKey(DataTable, on_delete=models.CASCADE)
    column = models.ForeignKey(ColumnMetadata, on_delete=models.CASCADE)
    null_count = models.IntegerField(default=0)
    null_percentage = models.FloatField(default=0)
    distinct_count = models.IntegerField(default=0)
    min_value = models.CharField(max_length=255, blank=True, null=True)
    max_value = models.CharField(max_length=255, blank=True, null=True)
    avg_value = models.FloatField(blank=True, null=True)
    most_frequent = models.CharField(max_length=255, blank=True, null=True)
    calculated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("table", "column")

class MetricHistory(models.Model):
    table = models.ForeignKey("DataTable", on_delete=models.CASCADE)
    column = models.CharField(max_length=255, null=True, blank=True)  # Null for row count
    metric_type = models.CharField(max_length=50)  # 'row_count', 'null_pct', 'distinct_pct'
    value = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]
