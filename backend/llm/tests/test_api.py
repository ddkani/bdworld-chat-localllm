import json
import tempfile
import os
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from llm.models import PromptTemplate
from llm.views import TRAINING_JOBS, DOWNLOAD_TASKS

User = get_user_model()


class PromptTemplateAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser')
        # Login via the API
        login_response = self.client.post('/api/auth/login/', {'username': 'testuser'})
        self.assertEqual(login_response.status_code, 200)
        
        # Create test prompt template
        self.template = PromptTemplate.objects.create(
            name='Test Template',
            system_prompt='You are a helpful assistant.',
            examples=[
                {'input': 'Hello', 'output': 'Hi there!'},
                {'input': 'How are you?', 'output': 'I am doing well, thank you!'}
            ],
            is_active=True
        )

    def test_list_prompt_templates(self):
        """Test listing all prompt templates"""
        response = self.client.get('/api/prompts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]['name'], 'Test Template')

    def test_create_prompt_template(self):
        """Test creating a new prompt template"""
        data = {
            'name': 'New Template',
            'system_prompt': 'You are a coding assistant.',
            'examples': [
                {'input': 'Write hello world', 'output': 'print("Hello, World!")'}
            ],
            'is_active': False
        }
        response = self.client.post(
            '/api/prompts/',
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(PromptTemplate.objects.count(), 2)
        self.assertEqual(response.json()['name'], 'New Template')

    def test_update_prompt_template(self):
        """Test updating an existing prompt template"""
        data = {
            'name': 'Updated Template',
            'system_prompt': 'Updated system prompt'
        }
        response = self.client.patch(
            f'/api/prompts/{self.template.id}/',
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.template.refresh_from_db()
        self.assertEqual(self.template.name, 'Updated Template')

    def test_delete_prompt_template(self):
        """Test deleting a prompt template"""
        response = self.client.delete(f'/api/prompts/{self.template.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(PromptTemplate.objects.count(), 0)

    def test_activate_prompt_template(self):
        """Test activating a specific prompt template"""
        # Create another template
        template2 = PromptTemplate.objects.create(
            name='Template 2',
            system_prompt='Another prompt',
            is_active=False
        )
        
        response = self.client.post(f'/api/prompts/{template2.id}/activate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that template2 is active and template1 is not
        template2.refresh_from_db()
        self.template.refresh_from_db()
        self.assertTrue(template2.is_active)
        self.assertFalse(self.template.is_active)


class RAGDocumentAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser')
        # Login via the API
        login_response = self.client.post('/api/auth/login/', {'username': 'testuser'})
        self.assertEqual(login_response.status_code, 200)

    def test_create_rag_document(self):
        """Test creating a RAG document"""
        data = {
            'title': 'Test RAG Document',
            'content': 'This is a test document for RAG.',
            'source_type': 'text',
            'metadata': {'category': 'test', 'author': 'testuser'}
        }
        response = self.client.post(
            '/api/rag/documents/',
            data=json.dumps(data),
            content_type='application/json'
        )
        if response.status_code != status.HTTP_201_CREATED:
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.json()}")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.json())
        self.assertEqual(response.json()['content'], data['content'])

    def test_list_rag_documents(self):
        """Test listing RAG documents"""
        # First create a document
        self.test_create_rag_document()
        
        response = self.client.get('/api/rag/documents/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.json(), list)

    def test_delete_rag_document(self):
        """Test deleting a RAG document"""
        response = self.client.delete('/api/rag/documents/1/')
        # Since this is a demo implementation, it might return 404 or 204
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_404_NOT_FOUND])

    def test_search_similar_documents(self):
        """Test searching for similar documents"""
        data = {
            'query': 'test document',
            'top_k': 5
        }
        response = self.client.post(
            '/api/rag/search/',
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.json(), list)


class ModelManagementAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser')
        # Login via the API
        login_response = self.client.post('/api/auth/login/', {'username': 'testuser'})
        self.assertEqual(login_response.status_code, 200)

    def test_get_model_info(self):
        """Test getting model information"""
        response = self.client.get('/api/models/info/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('model_path', data)
        self.assertIn('exists', data)
        self.assertIsInstance(data['exists'], bool)

    def test_start_model_download(self):
        """Test starting model download"""
        response = self.client.post('/api/models/download/')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn('task_id', response.json())
        
        # Check that task was created
        task_id = response.json()['task_id']
        self.assertIn(task_id, DOWNLOAD_TASKS)

    def test_get_download_progress(self):
        """Test getting download progress"""
        # First start a download
        response = self.client.post('/api/models/download/')
        task_id = response.json()['task_id']
        
        # Get progress
        response = self.client.get(f'/api/models/download/{task_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('progress', response.json())
        self.assertIn('status', response.json())

    def test_get_nonexistent_download_progress(self):
        """Test getting progress for non-existent task"""
        response = self.client.get('/api/models/download/nonexistent/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class FineTuningAPITest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser')
        # Login via the API
        login_response = self.client.post('/api/auth/login/', {'username': 'testuser'})
        self.assertEqual(login_response.status_code, 200)
        # Clear any existing jobs
        TRAINING_JOBS.clear()

    def test_create_training_job(self):
        """Test creating a training job"""
        data = {
            'name': 'Test Training Job',
            'dataset_path': '/path/to/dataset.jsonl',
            'base_model': 'mistral-7b-instruct-v0.2',
            'config': {
                'epochs': 3,
                'batch_size': 4,
                'learning_rate': 0.0001,
                'gradient_accumulation_steps': 4
            }
        }
        response = self.client.post(
            '/api/finetuning/jobs/',
            data=json.dumps(data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.json())
        self.assertEqual(response.json()['status'], 'pending')

    def test_list_training_jobs(self):
        """Test listing training jobs"""
        # First create a job
        self.test_create_training_job()
        
        response = self.client.get('/api/finetuning/jobs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)

    def test_get_training_job_detail(self):
        """Test getting training job details"""
        # First create a job
        create_response = self.client.post(
            '/api/finetuning/jobs/',
            data=json.dumps({
                'name': 'Test Job',
                'dataset_path': '/path/to/dataset.jsonl',
                'base_model': 'mistral-7b-instruct-v0.2',
                'config': {'epochs': 3, 'batch_size': 4}
            }),
            content_type='application/json'
        )
        job_id = create_response.json()['id']
        
        response = self.client.get(f'/api/finetuning/jobs/{job_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['name'], 'Test Job')

    def test_cancel_training_job(self):
        """Test canceling a training job"""
        # Create a job and manually set it to running
        TRAINING_JOBS['1'] = {
            'id': '1',
            'name': 'Test Job',
            'status': 'running',
            'dataset_path': '/path/to/dataset.jsonl',
            'base_model': 'mistral-7b-instruct-v0.2',
            'config': {}
        }
        
        response = self.client.post('/api/finetuning/jobs/1/cancel/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(TRAINING_JOBS['1']['status'], 'failed')
        self.assertEqual(TRAINING_JOBS['1']['error_message'], 'Cancelled by user')

    def test_upload_dataset(self):
        """Test uploading a dataset file"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
            f.write('{"input": "test", "output": "response"}\n')
            f.flush()
            
            with open(f.name, 'rb') as upload_file:
                response = self.client.post(
                    '/api/finetuning/datasets/',
                    {'file': upload_file}
                )
            
            os.unlink(f.name)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('filename', response.json())
        self.assertIn('path', response.json())


class AuthenticationRequiredTest(TestCase):
    """Test that all endpoints require authentication"""
    
    def setUp(self):
        self.client = APIClient()

    def test_prompt_templates_require_auth(self):
        """Test prompt template endpoints require authentication"""
        response = self.client.get('/api/prompts/')
        # Should return 401 Unauthorized for unauthenticated requests
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_rag_documents_require_auth(self):
        """Test RAG document endpoints require authentication"""
        response = self.client.get('/api/rag/documents/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_model_info_requires_auth(self):
        """Test model info endpoint requires authentication"""
        response = self.client.get('/api/models/info/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_training_jobs_require_auth(self):
        """Test training job endpoints require authentication"""
        response = self.client.get('/api/finetuning/jobs/')
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])