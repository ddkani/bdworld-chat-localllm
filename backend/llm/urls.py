from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'prompts', views.PromptTemplateViewSet, basename='prompttemplate')

urlpatterns = [
    path('', include(router.urls)),
    
    # RAG endpoints
    path('rag/documents/', views.RAGDocumentListView.as_view(), name='rag-documents'),
    path('rag/documents/<int:pk>/', views.RAGDocumentDetailView.as_view(), name='rag-document-detail'),
    path('rag/search/', views.RAGSearchView.as_view(), name='rag-search'),
    
    # Model management endpoints
    path('models/info/', views.ModelInfoView.as_view(), name='model-info'),
    path('models/download/', views.ModelDownloadView.as_view(), name='model-download'),
    path('models/download/<str:task_id>/', views.ModelDownloadProgressView.as_view(), name='model-download-progress'),
    
    # Fine-tuning endpoints
    path('finetuning/jobs/', views.TrainingJobListView.as_view(), name='training-jobs'),
    path('finetuning/jobs/<int:pk>/', views.TrainingJobDetailView.as_view(), name='training-job-detail'),
    path('finetuning/jobs/<int:pk>/cancel/', views.TrainingJobCancelView.as_view(), name='training-job-cancel'),
    path('finetuning/datasets/', views.DatasetUploadView.as_view(), name='dataset-upload'),
]