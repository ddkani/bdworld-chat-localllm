import os
import json
import uuid
from pathlib import Path
from datetime import datetime
from django.conf import settings
from rest_framework import views, viewsets, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from .models import PromptTemplate
from .serializers import (
    PromptTemplateSerializer,
    RAGDocumentSerializer,
    RAGSearchSerializer,
    ModelInfoSerializer,
    TrainingJobSerializer,
    DatasetUploadSerializer,
)
from .llm_service import LLMService, RAGService
import subprocess
import threading


# In-memory storage for demo purposes (should use database in production)
TRAINING_JOBS = {}
DOWNLOAD_TASKS = {}


class PromptTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing prompt templates"""
    queryset = PromptTemplate.objects.all()
    serializer_class = PromptTemplateSerializer
    permission_classes = [IsAuthenticated]
    
    def perform_update(self, serializer):
        # If setting as active, deactivate all others
        if serializer.validated_data.get('is_active'):
            PromptTemplate.objects.exclude(pk=serializer.instance.pk).update(is_active=False)
        serializer.save()
    
    def perform_create(self, serializer):
        # If setting as active, deactivate all others
        if serializer.validated_data.get('is_active'):
            PromptTemplate.objects.update(is_active=False)
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a specific prompt template"""
        template = self.get_object()
        PromptTemplate.objects.update(is_active=False)
        template.is_active = True
        template.save()
        serializer = self.get_serializer(template)
        return Response(serializer.data)


class RAGDocumentListView(views.APIView):
    """List and create RAG documents"""
    permission_classes = [IsAuthenticated]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.rag_service = None
    
    def get_rag_service(self):
        if self.rag_service is None:
            self.rag_service = RAGService()
        return self.rag_service
    
    def get(self, request):
        query = request.query_params.get('query')
        limit = int(request.query_params.get('limit', 20))
        
        # For demo, we'll return mock data
        # In production, query from SQLite database
        documents = []
        
        # Mock data for demonstration
        if hasattr(self, '_documents'):
            documents = self._documents[-limit:]
        
        serializer = RAGDocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        serializer = RAGDocumentSerializer(data=request.data)
        if serializer.is_valid():
            # Add document to RAG service
            content = serializer.validated_data['content']
            metadata = serializer.validated_data.get('metadata', {})
            
            # Add title and source_type to metadata for RAG service
            metadata['title'] = serializer.validated_data['title']
            metadata['source_type'] = serializer.validated_data['source_type']
            
            self.get_rag_service().add_document(content, metadata)
            
            # Create response with ID and timestamps
            doc_data = serializer.validated_data
            doc_data['id'] = len(getattr(self, '_documents', [])) + 1
            doc_data['created_at'] = datetime.now()
            doc_data['updated_at'] = datetime.now()
            
            # Store in memory for demo
            if not hasattr(self, '_documents'):
                self._documents = []
            self._documents.append(doc_data)
            
            return Response(RAGDocumentSerializer(doc_data).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RAGDocumentDetailView(views.APIView):
    """Retrieve, update, or delete a RAG document"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, pk):
        # In production, delete from database
        return Response(status=status.HTTP_204_NO_CONTENT)


class RAGSearchView(views.APIView):
    """Search for similar documents"""
    permission_classes = [IsAuthenticated]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.rag_service = None
    
    def get_rag_service(self):
        if self.rag_service is None:
            self.rag_service = RAGService()
        return self.rag_service
    
    def post(self, request):
        serializer = RAGSearchSerializer(data=request.data)
        if serializer.is_valid():
            query = serializer.validated_data['query']
            top_k = serializer.validated_data['top_k']
            
            results = self.get_rag_service().search_similar(query, top_k)
            
            # Convert results to serializer format
            documents = []
            for result in results:
                doc = {
                    'id': result['id'],
                    'title': result['metadata'].get('title', 'Untitled'),
                    'content': result['content'],
                    'source_type': result['metadata'].get('source_type', 'text'),
                    'metadata': result['metadata'],
                    'similarity': result['similarity'],
                    'created_at': datetime.now(),  # Mock timestamp
                    'updated_at': datetime.now()
                }
                documents.append(doc)
            
            return Response(RAGDocumentSerializer(documents, many=True).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ModelInfoView(views.APIView):
    """Get model information"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        model_path = os.getenv('MODEL_PATH', 'models/mistral-7b-instruct-v0.2.Q4_K_M.gguf')
        full_path = Path(model_path)
        
        info = {
            'model_path': model_path,
            'exists': full_path.exists(),
        }
        
        if full_path.exists():
            info['size'] = full_path.stat().st_size
        
        serializer = ModelInfoSerializer(info)
        return Response(serializer.data)


class ModelDownloadView(views.APIView):
    """Start model download"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        task_id = str(uuid.uuid4())
        
        # Start download in background thread
        def download_model():
            DOWNLOAD_TASKS[task_id] = {'progress': 0, 'status': 'running'}
            
            try:
                # Run the download command
                process = subprocess.Popen(
                    ['uv', 'run', 'python', 'manage.py', 'download_model'],
                    cwd=settings.BASE_DIR,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                # Simulate progress updates
                for i in range(0, 101, 10):
                    if task_id in DOWNLOAD_TASKS:
                        DOWNLOAD_TASKS[task_id]['progress'] = i
                        import time
                        time.sleep(1)
                
                process.wait()
                
                if process.returncode == 0:
                    DOWNLOAD_TASKS[task_id] = {'progress': 100, 'status': 'completed'}
                else:
                    DOWNLOAD_TASKS[task_id] = {'progress': 0, 'status': 'failed'}
            except Exception as e:
                DOWNLOAD_TASKS[task_id] = {'progress': 0, 'status': 'failed', 'error': str(e)}
        
        thread = threading.Thread(target=download_model)
        thread.start()
        
        return Response({'task_id': task_id}, status=status.HTTP_202_ACCEPTED)


class ModelDownloadProgressView(views.APIView):
    """Get download progress"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, task_id):
        if task_id not in DOWNLOAD_TASKS:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        
        return Response(DOWNLOAD_TASKS[task_id])


class TrainingJobListView(views.APIView):
    """List and create training jobs"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        jobs = []
        for job_id, job_data in TRAINING_JOBS.items():
            job_data['id'] = job_id
            jobs.append(job_data)
        
        serializer = TrainingJobSerializer(jobs, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        serializer = TrainingJobSerializer(data=request.data)
        if serializer.is_valid():
            job_id = str(len(TRAINING_JOBS) + 1)  # Convert to string for consistency
            job_data = serializer.validated_data
            job_data['id'] = job_id
            job_data['status'] = 'pending'
            job_data['created_at'] = datetime.now()
            job_data['updated_at'] = datetime.now()
            
            TRAINING_JOBS[job_id] = job_data
            
            # Start training in background (mock)
            def run_training(job_id):
                import time
                time.sleep(2)
                if job_id in TRAINING_JOBS:
                    TRAINING_JOBS[job_id]['status'] = 'running'
                    TRAINING_JOBS[job_id]['updated_at'] = datetime.now()
                    
                    # Simulate training time
                    time.sleep(10)
                    
                    if job_id in TRAINING_JOBS:
                        TRAINING_JOBS[job_id]['status'] = 'completed'
                        TRAINING_JOBS[job_id]['updated_at'] = datetime.now()
            
            thread = threading.Thread(target=run_training, args=(job_id,))
            thread.start()
            
            return Response(TrainingJobSerializer(job_data).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TrainingJobDetailView(views.APIView):
    """Get training job details"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk):
        # Convert pk to string for consistency
        job_id = str(pk)
        if job_id not in TRAINING_JOBS:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        
        job_data = TRAINING_JOBS[job_id]
        job_data['id'] = job_id
        serializer = TrainingJobSerializer(job_data)
        return Response(serializer.data)


class TrainingJobCancelView(views.APIView):
    """Cancel a training job"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, pk):
        # Convert pk to string for consistency
        job_id = str(pk)
        if job_id not in TRAINING_JOBS:
            return Response({'error': 'Job not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if TRAINING_JOBS[job_id]['status'] == 'running':
            TRAINING_JOBS[job_id]['status'] = 'failed'
            TRAINING_JOBS[job_id]['error_message'] = 'Cancelled by user'
            TRAINING_JOBS[job_id]['updated_at'] = datetime.now()
        
        return Response(status=status.HTTP_204_NO_CONTENT)


class DatasetUploadView(views.APIView):
    """Upload dataset for fine-tuning"""
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    
    def post(self, request):
        serializer = DatasetUploadSerializer(data=request.data)
        if serializer.is_valid():
            file = serializer.validated_data['file']
            
            # Save file to datasets directory
            datasets_dir = Path(settings.BASE_DIR) / 'datasets'
            datasets_dir.mkdir(exist_ok=True)
            
            filename = f"{uuid.uuid4()}_{file.name}"
            filepath = datasets_dir / filename
            
            with open(filepath, 'wb') as f:
                for chunk in file.chunks():
                    f.write(chunk)
            
            return Response({
                'filename': filename,
                'path': str(filepath)
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)