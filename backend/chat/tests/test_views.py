from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from chat.models import ChatSession, Message, RAGDocument, PromptTemplate
import json

User = get_user_model()


class AuthenticationTest(TestCase):
    """Test authentication endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        
    def test_login_new_user(self):
        """Test login creates new user if doesn't exist"""
        response = self.client.post(
            reverse('login'),
            {'username': 'newuser'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'newuser')
        self.assertTrue(User.objects.filter(username='newuser').exists())
        
    def test_login_existing_user(self):
        """Test login with existing user"""
        User.objects.create_user(username='existinguser')
        
        response = self.client.post(
            reverse('login'),
            {'username': 'existinguser'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'existinguser')
        
    def test_login_empty_username(self):
        """Test login with empty username"""
        response = self.client.post(
            reverse('login'),
            {'username': ''},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
        
    def test_logout(self):
        """Test logout endpoint"""
        user = User.objects.create_user(username='testuser')
        self.client.force_authenticate(user=user)
        
        response = self.client.post(reverse('logout'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_current_user(self):
        """Test getting current user info"""
        user = User.objects.create_user(username='testuser')
        self.client.force_authenticate(user=user)
        
        response = self.client.get(reverse('current_user'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['user']['username'], 'testuser')


class ChatSessionAPITest(TestCase):
    """Test ChatSession API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser')
        self.client.force_authenticate(user=self.user)
        
    def test_list_sessions(self):
        """Test listing user sessions"""
        ChatSession.objects.create(user=self.user, title='Session 1')
        ChatSession.objects.create(user=self.user, title='Session 2')
        
        response = self.client.get(reverse('sessions_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
    def test_create_session(self):
        """Test creating new session"""
        response = self.client.post(
            reverse('sessions_list'),
            {'title': 'New Session'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Session')
        self.assertTrue(ChatSession.objects.filter(title='New Session').exists())
        
    def test_get_session_detail(self):
        """Test getting session details"""
        session = ChatSession.objects.create(user=self.user, title='Test Session')
        
        response = self.client.get(reverse('session_detail', args=[session.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Session')
        
    def test_update_session(self):
        """Test updating session"""
        session = ChatSession.objects.create(user=self.user, title='Old Title')
        
        response = self.client.put(
            reverse('session_detail', args=[session.id]),
            {'title': 'New Title'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'New Title')
        
    def test_delete_session(self):
        """Test soft deleting session"""
        session = ChatSession.objects.create(user=self.user, title='To Delete')
        
        response = self.client.delete(reverse('session_detail', args=[session.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        session.refresh_from_db()
        self.assertFalse(session.is_active)
        
    def test_get_session_messages(self):
        """Test getting messages for a session"""
        session = ChatSession.objects.create(user=self.user)
        Message.objects.create(session=session, role='user', content='Hello')
        Message.objects.create(session=session, role='assistant', content='Hi there!')
        
        response = self.client.get(reverse('session_messages', args=[session.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        
    def test_unauthorized_access(self):
        """Test unauthorized access to sessions"""
        self.client.force_authenticate(user=None)
        
        response = self.client.get(reverse('sessions_list'))
        # DRF returns 403 for unauthenticated requests with IsAuthenticated permission
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])


class RAGDocumentAPITest(TestCase):
    """Test RAG Document API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser')
        self.client.force_authenticate(user=self.user)
        
    def test_list_documents(self):
        """Test listing RAG documents"""
        RAGDocument.objects.create(
            title='Doc 1',
            content='Content 1',
            source_type='text'
        )
        
        response = self.client.get(reverse('rag_documents_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
    def test_create_document(self):
        """Test creating RAG document"""
        data = {
            'title': 'New Document',
            'content': 'Document content',
            'source_type': 'text',
            'tags': ['test', 'api']
        }
        
        response = self.client.post(
            reverse('rag_documents_list'),
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'New Document')
        self.assertEqual(response.data['added_by']['username'], 'testuser')
        
    def test_update_document(self):
        """Test updating RAG document"""
        doc = RAGDocument.objects.create(
            title='Original',
            content='Content',
            source_type='text'
        )
        
        response = self.client.put(
            reverse('rag_document_detail', args=[doc.id]),
            {'title': 'Updated Title'},
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Title')
        
    def test_delete_document(self):
        """Test soft deleting document"""
        doc = RAGDocument.objects.create(
            title='To Delete',
            content='Content',
            source_type='text'
        )
        
        response = self.client.delete(reverse('rag_document_detail', args=[doc.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        doc.refresh_from_db()
        self.assertFalse(doc.is_active)


class PromptTemplateAPITest(TestCase):
    """Test Prompt Template API endpoints"""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser')
        self.client.force_authenticate(user=self.user)
        
    def test_list_templates(self):
        """Test listing prompt templates"""
        PromptTemplate.objects.create(
            name='template1',
            system_prompt='Prompt 1',
            created_by=self.user
        )
        
        response = self.client.get(reverse('prompt_templates_list'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        
    def test_create_template(self):
        """Test creating prompt template"""
        data = {
            'name': 'new_template',
            'description': 'A new template',
            'system_prompt': 'You are helpful',
            'examples': [
                {'user': 'Hi', 'assistant': 'Hello!'}
            ]
        }
        
        response = self.client.post(
            reverse('prompt_templates_list'),
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'new_template')
        self.assertEqual(len(response.data['examples']), 1)
        
    def test_template_name_uniqueness(self):
        """Test template name must be unique"""
        PromptTemplate.objects.create(
            name='unique_name',
            system_prompt='Prompt',
            created_by=self.user
        )
        
        response = self.client.post(
            reverse('prompt_templates_list'),
            {
                'name': 'unique_name',
                'system_prompt': 'Another prompt'
            },
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)