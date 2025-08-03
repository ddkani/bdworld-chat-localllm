from django.db import models


class PromptTemplate(models.Model):
    """Prompt template for LLM interactions"""
    name = models.CharField(max_length=200, unique=True)
    system_prompt = models.TextField()
    examples = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return self.name