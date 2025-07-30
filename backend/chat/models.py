from django.db import models
from django.contrib.auth.models import AbstractUser, UserManager
from django.utils import timezone
import json


class NoPasswordUserManager(UserManager):
    """Custom user manager that doesn't require password"""
    def create_user(self, username, email=None, password=None, **extra_fields):
        if not username:
            raise ValueError('The Username field must be set')
        username = self.model.normalize_username(username)
        user = self.model(username=username, email=email, **extra_fields)
        # Don't set password
        user.save(using=self._db)
        return user


class User(AbstractUser):
    """Custom user model with username-only authentication"""
    username = models.CharField(max_length=150, unique=True)
    created_at = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    email = models.EmailField(blank=True, null=True)
    
    # Remove password field requirement
    password = None
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []
    
    objects = NoPasswordUserManager()
    
    class Meta:
        db_table = 'chat_users'
        verbose_name = 'User'
        verbose_name_plural = 'Users'


class ChatSession(models.Model):
    """Chat session for organizing conversations"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    title = models.CharField(max_length=255, default='New Chat')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # Store session-specific settings
    settings = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = 'chat_sessions'
        ordering = ['-updated_at']
        
    def __str__(self):
        return f"{self.user.username} - {self.title}"
    
    def get_settings(self):
        """Get session settings with defaults"""
        defaults = {
            'temperature': 0.7,
            'max_tokens': 512,
            'system_prompt': None,
            'prompt_template': 'default'
        }
        return {**defaults, **self.settings}


class Message(models.Model):
    """Individual messages in a chat session"""
    ROLE_CHOICES = [
        ('user', 'User'),
        ('assistant', 'Assistant'),
        ('system', 'System'),
    ]
    
    session = models.ForeignKey(ChatSession, on_delete=models.CASCADE, related_name='messages')
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    
    # Optional metadata
    metadata = models.JSONField(default=dict, blank=True)
    
    # Track if RAG was used for this message
    rag_context = models.TextField(null=True, blank=True)
    
    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
        
    def __str__(self):
        return f"{self.role}: {self.content[:50]}..."


class RAGDocument(models.Model):
    """Documents for RAG system"""
    SOURCE_CHOICES = [
        ('upload', 'File Upload'),
        ('text', 'Text Input'),
        ('url', 'URL'),
    ]
    
    title = models.CharField(max_length=255)
    content = models.TextField()
    source_type = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    source_path = models.CharField(max_length=500, null=True, blank=True)
    
    # Metadata for filtering and organization
    metadata = models.JSONField(default=dict, blank=True)
    tags = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Track which user added this document
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='rag_documents')
    
    # Whether this document is active in the RAG system
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'rag_documents'
        ordering = ['-created_at']
        
    def __str__(self):
        return self.title


class PromptTemplate(models.Model):
    """Prompt templates for fine-tuning"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    system_prompt = models.TextField()
    
    # Example conversations for few-shot learning
    examples = models.JSONField(default=list, blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'prompt_templates'
        ordering = ['name']
        
    def __str__(self):
        return self.name
    
    def add_example(self, user_input, assistant_response):
        """Add an example conversation"""
        self.examples.append({
            'user': user_input,
            'assistant': assistant_response
        })
        self.save()
