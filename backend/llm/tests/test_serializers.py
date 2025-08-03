from django.test import TestCase
from datetime import datetime
from llm.serializers import (
    PromptTemplateSerializer,
    RAGDocumentSerializer,
    RAGSearchSerializer,
    ModelInfoSerializer,
    TrainingJobSerializer,
    DatasetUploadSerializer,
)
from llm.models import PromptTemplate


class PromptTemplateSerializerTest(TestCase):
    def test_serialize_prompt_template(self):
        """Test serializing a prompt template"""
        template = PromptTemplate.objects.create(
            name='Test Template',
            system_prompt='You are a helpful assistant.',
            examples=[{'input': 'Hi', 'output': 'Hello!'}],
            is_active=True
        )
        
        serializer = PromptTemplateSerializer(template)
        data = serializer.data
        
        self.assertEqual(data['name'], 'Test Template')
        self.assertEqual(data['system_prompt'], 'You are a helpful assistant.')
        self.assertEqual(len(data['examples']), 1)
        self.assertTrue(data['is_active'])
        self.assertIn('created_at', data)
        self.assertIn('updated_at', data)

    def test_deserialize_prompt_template(self):
        """Test deserializing prompt template data"""
        data = {
            'name': 'New Template',
            'system_prompt': 'System prompt',
            'examples': [
                {'input': 'Question', 'output': 'Answer'}
            ],
            'is_active': False
        }
        
        serializer = PromptTemplateSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        template = serializer.save()
        self.assertEqual(template.name, 'New Template')
        self.assertEqual(template.system_prompt, 'System prompt')
        self.assertEqual(len(template.examples), 1)
        self.assertFalse(template.is_active)

    def test_prompt_template_validation(self):
        """Test prompt template validation"""
        # Missing required fields
        data = {'name': 'Test'}
        serializer = PromptTemplateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('system_prompt', serializer.errors)


class RAGDocumentSerializerTest(TestCase):
    def test_serialize_rag_document(self):
        """Test serializing a RAG document"""
        doc_data = {
            'id': 1,
            'title': 'Test Document',
            'content': 'Test document content',
            'source_type': 'text',
            'metadata': {'category': 'test'},
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'similarity': 0.95
        }
        
        serializer = RAGDocumentSerializer(doc_data)
        data = serializer.data
        
        self.assertEqual(data['title'], 'Test Document')
        self.assertEqual(data['content'], 'Test document content')
        self.assertEqual(data['source_type'], 'text')
        self.assertEqual(data['metadata'], {'category': 'test'})
        self.assertEqual(data['similarity'], 0.95)

    def test_deserialize_rag_document(self):
        """Test deserializing RAG document data"""
        data = {
            'title': 'New Document',
            'content': 'New document',
            'source_type': 'text',
            'metadata': {'author': 'test'}
        }
        
        serializer = RAGDocumentSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        validated = serializer.validated_data
        self.assertEqual(validated['title'], 'New Document')
        self.assertEqual(validated['content'], 'New document')
        self.assertEqual(validated['source_type'], 'text')
        self.assertEqual(validated['metadata'], {'author': 'test'})

    def test_rag_document_without_metadata(self):
        """Test RAG document without metadata"""
        data = {
            'title': 'Document without metadata',
            'content': 'Document without metadata',
            'source_type': 'text'
        }
        
        serializer = RAGDocumentSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['metadata'], {})


class RAGSearchSerializerTest(TestCase):
    def test_valid_search_query(self):
        """Test valid search query"""
        data = {
            'query': 'search term',
            'top_k': 10
        }
        
        serializer = RAGSearchSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['query'], 'search term')
        self.assertEqual(serializer.validated_data['top_k'], 10)

    def test_default_top_k(self):
        """Test default top_k value"""
        data = {'query': 'search term'}
        
        serializer = RAGSearchSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        self.assertEqual(serializer.validated_data['top_k'], 5)

    def test_top_k_validation(self):
        """Test top_k validation"""
        # Too high
        data = {'query': 'search', 'top_k': 25}
        serializer = RAGSearchSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        
        # Too low
        data = {'query': 'search', 'top_k': 0}
        serializer = RAGSearchSerializer(data=data)
        self.assertFalse(serializer.is_valid())


class ModelInfoSerializerTest(TestCase):
    def test_serialize_model_info(self):
        """Test serializing model info"""
        info = {
            'model_path': '/path/to/model.gguf',
            'exists': True,
            'size': 4294967296  # 4GB
        }
        
        serializer = ModelInfoSerializer(info)
        data = serializer.data
        
        self.assertEqual(data['model_path'], '/path/to/model.gguf')
        self.assertTrue(data['exists'])
        self.assertEqual(data['size'], 4294967296)

    def test_model_info_without_size(self):
        """Test model info without size (model doesn't exist)"""
        info = {
            'model_path': '/path/to/model.gguf',
            'exists': False
        }
        
        serializer = ModelInfoSerializer(info)
        data = serializer.data
        
        self.assertEqual(data['model_path'], '/path/to/model.gguf')
        self.assertFalse(data['exists'])
        self.assertNotIn('size', data)


class TrainingJobSerializerTest(TestCase):
    def test_serialize_training_job(self):
        """Test serializing a training job"""
        job = {
            'id': '1',
            'name': 'Test Job',
            'status': 'running',
            'dataset_path': '/data/train.jsonl',
            'base_model': 'mistral-7b',
            'config': {'epochs': 3, 'batch_size': 4},
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        serializer = TrainingJobSerializer(job)
        data = serializer.data
        
        self.assertEqual(data['name'], 'Test Job')
        self.assertEqual(data['status'], 'running')
        self.assertEqual(data['config']['epochs'], 3)

    def test_deserialize_training_job(self):
        """Test deserializing training job data"""
        data = {
            'name': 'New Training',
            'dataset_path': '/data/dataset.jsonl',
            'base_model': 'llama-2-7b',
            'config': {
                'epochs': 5,
                'batch_size': 8,
                'learning_rate': 0.0001
            }
        }
        
        serializer = TrainingJobSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        
        validated = serializer.validated_data
        self.assertEqual(validated['name'], 'New Training')
        self.assertEqual(validated['config']['epochs'], 5)

    def test_training_job_with_error(self):
        """Test training job with error message"""
        job = {
            'id': '1',
            'name': 'Failed Job',
            'status': 'failed',
            'dataset_path': '/data/train.jsonl',
            'base_model': 'mistral-7b',
            'config': {},
            'created_at': datetime.now(),
            'updated_at': datetime.now(),
            'error_message': 'Out of memory'
        }
        
        serializer = TrainingJobSerializer(job)
        data = serializer.data
        
        self.assertEqual(data['status'], 'failed')
        self.assertEqual(data['error_message'], 'Out of memory')


class DatasetUploadSerializerTest(TestCase):
    def test_file_field_required(self):
        """Test that file field is required"""
        serializer = DatasetUploadSerializer(data={})
        self.assertFalse(serializer.is_valid())
        self.assertIn('file', serializer.errors)