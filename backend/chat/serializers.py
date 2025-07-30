from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ChatSession, Message, RAGDocument, PromptTemplate

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'created_at', 'last_login']
        read_only_fields = ['id', 'created_at', 'last_login']


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            'id', 'session', 'role', 'content', 
            'created_at', 'metadata', 'rag_context'
        ]
        read_only_fields = ['id', 'created_at']


class ChatSessionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    message_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatSession
        fields = [
            'id', 'user', 'title', 'created_at', 
            'updated_at', 'is_active', 'settings', 'message_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']
    
    def get_message_count(self, obj):
        return obj.messages.count()


class RAGDocumentSerializer(serializers.ModelSerializer):
    added_by = UserSerializer(read_only=True)
    
    class Meta:
        model = RAGDocument
        fields = [
            'id', 'title', 'content', 'source_type', 
            'source_path', 'metadata', 'tags', 
            'created_at', 'updated_at', 'added_by', 'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'added_by']


class PromptTemplateSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = PromptTemplate
        fields = [
            'id', 'name', 'description', 'system_prompt', 
            'examples', 'created_at', 'updated_at', 
            'created_by', 'is_active'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']