import json
import time
from django.test import TestCase, TransactionTestCase, Client
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status
from llm.models import PromptTemplate
from llm.views import TRAINING_JOBS, DOWNLOAD_TASKS
from llm.llm_service import RAGService

User = get_user_model()


class PromptTemplateIntegrationTest(TransactionTestCase):
    """Integration tests for prompt template functionality"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser')
        self.client.force_login(self.user)

    def test_prompt_template_activation_flow(self):
        """Test the complete flow of creating and activating templates"""
        # Create first template (active by default)
        template1_data = {
            'name': 'Coding Assistant',
            'system_prompt': 'You are a coding assistant.',
            'examples': [
                {'input': 'Write a function', 'output': 'def function():'}
            ],
            'is_active': True
        }
        response1 = self.client.post(
            '/api/prompts/',
            data=json.dumps(template1_data),
            content_type='application/json'
        )
        self.assertEqual(response1.status_code, status.HTTP_201_CREATED)
        template1_id = response1.json()['id']

        # Create second template (should deactivate the first)
        template2_data = {
            'name': 'Writing Assistant',
            'system_prompt': 'You are a writing assistant.',
            'examples': [],
            'is_active': True
        }
        response2 = self.client.post(
            '/api/prompts/',
            data=json.dumps(template2_data),
            content_type='application/json'
        )
        self.assertEqual(response2.status_code, status.HTTP_201_CREATED)
        template2_id = response2.json()['id']

        # Verify first template is now inactive
        response = self.client.get(f'/api/prompts/{template1_id}/')
        self.assertFalse(response.json()['is_active'])

        # Activate first template again
        response = self.client.post(f'/api/prompts/{template1_id}/activate/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verify states
        response1 = self.client.get(f'/api/prompts/{template1_id}/')
        response2 = self.client.get(f'/api/prompts/{template2_id}/')
        self.assertTrue(response1.json()['is_active'])
        self.assertFalse(response2.json()['is_active'])


class RAGIntegrationTest(TestCase):
    """Integration tests for RAG functionality"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser')
        self.client.force_login(self.user)
        self.rag_service = RAGService()

    def test_rag_document_lifecycle(self):
        """Test the complete lifecycle of RAG documents"""
        # Add documents
        docs = [
            {
                'title': 'Python Programming',
                'content': 'Python is a high-level programming language.',
                'source_type': 'text',
                'metadata': {'topic': 'programming', 'language': 'python'}
            },
            {
                'title': 'Django Framework',
                'content': 'Django is a web framework for Python.',
                'source_type': 'text',
                'metadata': {'topic': 'web', 'framework': 'django'}
            },
            {
                'title': 'Machine Learning Basics',
                'content': 'Machine learning uses algorithms to learn from data.',
                'source_type': 'text',
                'metadata': {'topic': 'ai', 'field': 'ml'}
            }
        ]

        created_ids = []
        for doc in docs:
            response = self.client.post(
                '/api/rag/documents/',
                data=json.dumps(doc),
                content_type='application/json'
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            if 'id' in response.json():
                created_ids.append(response.json()['id'])

        # Search for similar documents
        search_data = {
            'query': 'Python programming web development',
            'top_k': 3
        }
        response = self.client.post(
            '/api/rag/search/',
            data=json.dumps(search_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.json()
        self.assertIsInstance(results, list)
        
        # Verify search results contain similarity scores
        if results:
            self.assertIn('similarity', results[0])
            self.assertIn('content', results[0])

    def test_rag_search_with_empty_database(self):
        """Test RAG search when no documents exist"""
        search_data = {
            'query': 'nonexistent topic that should not match anything',
            'top_k': 5
        }
        response = self.client.post(
            '/api/rag/search/',
            data=json.dumps(search_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The search might return results from other tests, but they should have low similarity
        results = response.json()
        self.assertIsInstance(results, list)
        # If there are results, check that similarity scores are low
        for result in results:
            if 'similarity' in result:
                # Low similarity threshold since we're searching for unrelated content
                self.assertLess(result['similarity'], 0.5)


class ModelDownloadIntegrationTest(TestCase):
    """Integration tests for model download functionality"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser')
        self.client.force_login(self.user)
        # Clear any existing tasks
        DOWNLOAD_TASKS.clear()

    def test_model_download_workflow(self):
        """Test the complete model download workflow"""
        # Check initial model info
        response = self.client.get('/api/models/info/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        initial_info = response.json()
        
        # Start download
        response = self.client.post('/api/models/download/')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        task_id = response.json()['task_id']
        
        # Check progress immediately
        response = self.client.get(f'/api/models/download/{task_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        progress_data = response.json()
        self.assertIn('progress', progress_data)
        self.assertIn('status', progress_data)
        
        # Wait a bit and check progress again
        time.sleep(2)
        response = self.client.get(f'/api/models/download/{task_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.json()['progress'], 0)


class FineTuningIntegrationTest(TestCase):
    """Integration tests for fine-tuning functionality"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser')
        self.client.force_login(self.user)
        # Clear any existing jobs
        TRAINING_JOBS.clear()

    def test_training_job_lifecycle(self):
        """Test the complete lifecycle of a training job"""
        # Create a training job
        job_data = {
            'name': 'Integration Test Training',
            'dataset_path': '/test/dataset.jsonl',
            'base_model': 'mistral-7b-instruct-v0.2',
            'config': {
                'epochs': 2,
                'batch_size': 2,
                'learning_rate': 0.0001,
                'gradient_accumulation_steps': 2
            }
        }
        
        response = self.client.post(
            '/api/finetuning/jobs/',
            data=json.dumps(job_data),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        job_id = response.json()['id']
        
        # Check job status immediately (should be pending)
        response = self.client.get(f'/api/finetuning/jobs/{job_id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['status'], 'pending')
        
        # Wait for status to change to running
        time.sleep(3)
        response = self.client.get(f'/api/finetuning/jobs/{job_id}/')
        job_status = response.json()['status']
        self.assertIn(job_status, ['running', 'completed'])
        
        # If running, try to cancel
        if job_status == 'running':
            response = self.client.post(f'/api/finetuning/jobs/{job_id}/cancel/')
            self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
            
            # Verify cancellation
            response = self.client.get(f'/api/finetuning/jobs/{job_id}/')
            self.assertEqual(response.json()['status'], 'failed')
            self.assertEqual(response.json()['error_message'], 'Cancelled by user')

    def test_concurrent_training_jobs(self):
        """Test creating multiple training jobs concurrently"""
        jobs_data = [
            {
                'name': f'Concurrent Job {i}',
                'dataset_path': f'/test/dataset_{i}.jsonl',
                'base_model': 'mistral-7b-instruct-v0.2',
                'config': {'epochs': 1, 'batch_size': 4}
            }
            for i in range(3)
        ]
        
        job_ids = []
        for job_data in jobs_data:
            response = self.client.post(
                '/api/finetuning/jobs/',
                data=json.dumps(job_data),
                content_type='application/json'
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            job_ids.append(response.json()['id'])
        
        # List all jobs
        response = self.client.get('/api/finetuning/jobs/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 3)


class ErrorHandlingIntegrationTest(TestCase):
    """Test error handling across the API"""
    
    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(username='testuser')
        self.client.force_login(self.user)

    def test_invalid_json_handling(self):
        """Test handling of invalid JSON in requests"""
        response = self.client.post(
            '/api/prompts/',
            data='invalid json',
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_required_fields(self):
        """Test handling of missing required fields"""
        # Missing required fields in RAG document
        response = self.client.post(
            '/api/rag/documents/',
            data=json.dumps({'metadata': {}}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Missing query in RAG search
        response = self.client.post(
            '/api/rag/search/',
            data=json.dumps({'top_k': 5}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_nonexistent_resource_handling(self):
        """Test handling of requests for non-existent resources"""
        # Non-existent prompt template
        response = self.client.get('/api/prompts/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Non-existent training job
        response = self.client.get('/api/finetuning/jobs/99999/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Non-existent download task
        response = self.client.get('/api/models/download/nonexistent-task/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)