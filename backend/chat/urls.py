from django.urls import path
from . import views

urlpatterns = [
    # Authentication
    path('auth/login/', views.login_view, name='login'),
    path('auth/logout/', views.logout_view, name='logout'),
    path('auth/user/', views.current_user, name='current_user'),
    
    # Chat sessions
    path('sessions/', views.sessions_list, name='sessions_list'),
    path('sessions/<int:session_id>/', views.session_detail, name='session_detail'),
    path('sessions/<int:session_id>/messages/', views.session_messages, name='session_messages'),
    
    # RAG documents
    path('rag/documents/', views.rag_documents_list, name='rag_documents_list'),
    path('rag/documents/<int:document_id>/', views.rag_document_detail, name='rag_document_detail'),
    
    # Prompt templates
    path('prompts/templates/', views.prompt_templates_list, name='prompt_templates_list'),
    path('prompts/templates/<int:template_id>/', views.prompt_template_detail, name='prompt_template_detail'),
]