from django.contrib import admin
from .models import User, ChatSession, Message, RAGDocument, PromptTemplate

admin.site.register(User)
admin.site.register(ChatSession)
admin.site.register(Message)
admin.site.register(RAGDocument)
admin.site.register(PromptTemplate)
