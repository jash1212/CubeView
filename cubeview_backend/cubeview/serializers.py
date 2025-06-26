from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    DataTable, ColumnMetadata, Tag, DataTableTag, Incident,
    DataQualityCheck, ExportedMetadata, UserDatabaseConnection
)

User = get_user_model()

# ------------------ USER ------------------

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class RegisterSerializer(serializers.ModelSerializer):
    CHECK_FREQUENCY_CHOICES = [
        ("minutely", "Every Minute"),
        ("hourly", "Every Hour"),
        ("daily", "Every Day"),
    ]
    check_frequency = serializers.ChoiceField(
        choices=CHECK_FREQUENCY_CHOICES, required=False
    )

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'check_frequency']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def create(self, validated_data):
        check_frequency = validated_data.pop('check_frequency', None)
        user = User.objects.create_user(**validated_data)
        # You can store check_frequency later in a Profile or Setting model
        return user


# ------------------ DB CONNECTION ------------------

class UserDatabaseConnectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserDatabaseConnection
        fields = '__all__'
        read_only_fields = ['user']


# ------------------ DATA TABLE ------------------

class ColumnMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ColumnMetadata
        fields = ['name', 'data_type']

class DataTableSerializer(serializers.ModelSerializer):
    columns = ColumnMetadataSerializer(many=True, read_only=True)

    class Meta:
        model = DataTable
        fields = ['id', 'name', 'source', 'created_at', 'last_updated', 'description', 'columns']


# ------------------ OTHER MODELS ------------------

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = '__all__'

class DataTableTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataTableTag
        fields = '__all__'

class IncidentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Incident
        fields = '__all__'

class DataQualityCheckSerializer(serializers.ModelSerializer):
    class Meta:
        model = DataQualityCheck
        fields = '__all__'

class ExportedMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportedMetadata
        fields = '__all__'
