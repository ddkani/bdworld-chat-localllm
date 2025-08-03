from rest_framework import serializers
from .models import PromptTemplate


class PromptTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromptTemplate
        fields = ['id', 'name', 'system_prompt', 'examples', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class RAGDocumentSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    title = serializers.CharField(required=True)
    content = serializers.CharField()
    source_type = serializers.ChoiceField(choices=['upload', 'text', 'url'], required=True)
    source_path = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    metadata = serializers.JSONField(required=False, default=dict)
    tags = serializers.JSONField(required=False, default=list)
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    is_active = serializers.BooleanField(default=True)
    similarity = serializers.FloatField(read_only=True, required=False)


class RAGSearchSerializer(serializers.Serializer):
    query = serializers.CharField()
    top_k = serializers.IntegerField(default=5, min_value=1, max_value=20)


class ModelInfoSerializer(serializers.Serializer):
    model_path = serializers.CharField()
    exists = serializers.BooleanField()
    size = serializers.IntegerField(required=False)


class TrainingJobSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)  # Changed to CharField for string IDs
    name = serializers.CharField()
    status = serializers.ChoiceField(
        choices=['pending', 'running', 'completed', 'failed'],
        read_only=True
    )
    dataset_path = serializers.CharField()
    base_model = serializers.CharField()
    config = serializers.JSONField()
    created_at = serializers.DateTimeField(read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)
    error_message = serializers.CharField(read_only=True, required=False)


class DatasetUploadSerializer(serializers.Serializer):
    file = serializers.FileField()