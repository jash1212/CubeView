# Generated by Django 4.2.21 on 2025-06-20 17:07

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('cubeview', '0005_userdatabaseconnection_check_frequency_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='check_frequency',
            field=models.CharField(choices=[('minutely', 'Every Minute'), ('hourly', 'Every Hour'), ('daily', 'Every Day')], default='daily', max_length=20),
        ),
        migrations.AlterField(
            model_name='userdatabaseconnection',
            name='check_frequency',
            field=models.CharField(choices=[('minutely', 'Every Minute'), ('hourly', 'Every Hour'), ('daily', 'Every Day')], default='hourly', max_length=10),
        ),
        migrations.AlterField(
            model_name='userdatabaseconnection',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL),
        ),
    ]
