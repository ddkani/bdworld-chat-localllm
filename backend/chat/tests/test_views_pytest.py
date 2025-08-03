"""
Optimized API tests using pytest
"""
import pytest
from django.urls import reverse
from rest_framework import status
from chat.models import ChatSession, Message, RAGDocument, PromptTemplate


@pytest.mark.django_db
class TestAuthenticationAPI:
    """Test authentication endpoints with pytest"""
    
    def test_login_new_user(self, api_client):
        """Test login creates new user if doesn't exist"""
        response = api_client.post(
            reverse('login'),
            {'username': 'newuser'},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert 'user' in response.data
        assert response.data['user']['username'] == 'newuser'
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        assert User.objects.filter(username='newuser').exists()
        
    def test_login_existing_user(self, api_client, user):
        """Test login with existing user"""
        response = api_client.post(
            reverse('login'),
            {'username': user.username},
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['user']['username'] == user.username
        
    @pytest.mark.parametrize("username,expected_status", [
        ("", status.HTTP_400_BAD_REQUEST),
        ("   ", status.HTTP_400_BAD_REQUEST),
        ("valid_user", status.HTTP_200_OK),
    ])
    def test_login_validation(self, api_client, username, expected_status):
        """Test login with various inputs"""
        response = api_client.post(
            reverse('login'),
            {'username': username},
            format='json'
        )
        
        assert response.status_code == expected_status
        
    def test_logout(self, authenticated_api_client):
        """Test logout endpoint"""
        response = authenticated_api_client.post(reverse('logout'))
        assert response.status_code == status.HTTP_200_OK
        assert 'message' in response.data
        
    def test_current_user(self, authenticated_api_client, user):
        """Test getting current user info"""
        response = authenticated_api_client.get(reverse('current_user'))
        assert response.status_code == status.HTTP_200_OK
        assert response.data['user']['username'] == user.username
        
    def test_unauthorized_access(self, api_client):
        """Test unauthorized access returns 401"""
        protected_endpoints = [
            reverse('current_user'),
            reverse('sessions_list'),
            reverse('logout'),
        ]
        
        for endpoint in protected_endpoints:
            response = api_client.get(endpoint)
            # DRF returns 403 for unauthenticated requests with IsAuthenticated permission
            assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


@pytest.mark.django_db
class TestChatSessionAPI:
    """Test ChatSession API endpoints with pytest"""
    
    def test_list_sessions(self, authenticated_api_client, user):
        """Test listing user sessions"""
        # Create test sessions
        ChatSession.objects.create(user=user, title='Session 1')
        ChatSession.objects.create(user=user, title='Session 2')
        
        response = authenticated_api_client.get(reverse('sessions_list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        
    def test_list_sessions_only_active(self, authenticated_api_client, user):
        """Test listing only shows active sessions"""
        ChatSession.objects.create(user=user, title='Active', is_active=True)
        ChatSession.objects.create(user=user, title='Inactive', is_active=False)
        
        response = authenticated_api_client.get(reverse('sessions_list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['title'] == 'Active'
        
    def test_list_sessions_only_own(self, authenticated_api_client, user, another_user):
        """Test user only sees their own sessions"""
        ChatSession.objects.create(user=user, title='My Session')
        ChatSession.objects.create(user=another_user, title='Other Session')
        
        response = authenticated_api_client.get(reverse('sessions_list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['title'] == 'My Session'
        
    @pytest.mark.parametrize("title", [
        "New Session",
        "Chat with AI",
        "🤖 Robot Chat",
        "",  # Should use default
    ])
    def test_create_session(self, authenticated_api_client, title):
        """Test creating new session with various titles"""
        response = authenticated_api_client.post(
            reverse('sessions_list'),
            {'title': title} if title else {},
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert 'id' in response.data
        assert 'created_at' in response.data
        
        if title:
            assert response.data['title'] == title
        else:
            assert response.data['title'] == '새 대화'
            
    def test_get_session_detail(self, authenticated_api_client, chat_session):
        """Test getting session details"""
        response = authenticated_api_client.get(
            reverse('session_detail', args=[chat_session.id])
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == chat_session.id
        assert response.data['title'] == chat_session.title
        
    def test_update_session(self, authenticated_api_client, chat_session):
        """Test updating session"""
        new_data = {
            'title': 'Updated Title',
            'settings': {'temperature': 0.5}
        }
        
        response = authenticated_api_client.put(
            reverse('session_detail', args=[chat_session.id]),
            new_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Updated Title'
        
        # Verify in database
        chat_session.refresh_from_db()
        assert chat_session.title == 'Updated Title'
        
    def test_delete_session(self, authenticated_api_client, chat_session):
        """Test soft deleting session"""
        response = authenticated_api_client.delete(
            reverse('session_detail', args=[chat_session.id])
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        chat_session.refresh_from_db()
        assert not chat_session.is_active
        
    def test_get_session_messages(self, authenticated_api_client, chat_session):
        """Test getting messages for a session"""
        # Create test messages
        Message.objects.create(session=chat_session, role='user', content='Hello')
        Message.objects.create(session=chat_session, role='assistant', content='Hi!')
        
        response = authenticated_api_client.get(
            reverse('session_messages', args=[chat_session.id])
        )
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 2
        assert response.data[0]['content'] == 'Hello'
        assert response.data[1]['content'] == 'Hi!'
        
    def test_session_not_found(self, authenticated_api_client):
        """Test accessing non-existent session"""
        response = authenticated_api_client.get(
            reverse('session_detail', args=[99999])
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND
        
    def test_access_other_user_session(self, authenticated_api_client, another_user):
        """Test user cannot access another user's session"""
        other_session = ChatSession.objects.create(
            user=another_user,
            title='Private Session'
        )
        
        response = authenticated_api_client.get(
            reverse('session_detail', args=[other_session.id])
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
class TestRAGDocumentAPI:
    """Test RAG Document API endpoints with pytest"""
    
    def test_list_documents(self, authenticated_api_client, rag_document):
        """Test listing RAG documents"""
        response = authenticated_api_client.get(reverse('rag_documents_list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['title'] == rag_document.title
        
    def test_list_only_active_documents(self, authenticated_api_client, user):
        """Test listing only shows active documents"""
        RAGDocument.objects.create(
            title='Active Doc',
            content='Content',
            source_type='text',
            is_active=True
        )
        RAGDocument.objects.create(
            title='Inactive Doc',
            content='Content',
            source_type='text',
            is_active=False
        )
        
        response = authenticated_api_client.get(reverse('rag_documents_list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['title'] == 'Active Doc'
        
    @pytest.mark.parametrize("doc_data,expected_status", [
        (
            {
                'title': 'Valid Doc',
                'content': 'Content',
                'source_type': 'text',
                'tags': ['test']
            },
            status.HTTP_201_CREATED
        ),
        (
            {
                'title': 'Missing Content',
                'source_type': 'text'
            },
            status.HTTP_400_BAD_REQUEST
        ),
        (
            {
                'content': 'Missing Title',
                'source_type': 'text'
            },
            status.HTTP_400_BAD_REQUEST
        ),
    ])
    def test_create_document(self, authenticated_api_client, doc_data, expected_status):
        """Test creating RAG document with various data"""
        response = authenticated_api_client.post(
            reverse('rag_documents_list'),
            doc_data,
            format='json'
        )
        
        assert response.status_code == expected_status
        
        if expected_status == status.HTTP_201_CREATED:
            assert response.data['title'] == doc_data['title']
            assert 'added_by' in response.data
            
    def test_update_document(self, authenticated_api_client, rag_document):
        """Test updating RAG document"""
        update_data = {
            'title': 'Updated Title',
            'tags': ['updated', 'test']
        }
        
        response = authenticated_api_client.put(
            reverse('rag_document_detail', args=[rag_document.id]),
            update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['title'] == 'Updated Title'
        assert set(response.data['tags']) == {'updated', 'test'}
        
    def test_delete_document(self, authenticated_api_client, rag_document):
        """Test soft deleting document"""
        response = authenticated_api_client.delete(
            reverse('rag_document_detail', args=[rag_document.id])
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        
        rag_document.refresh_from_db()
        assert not rag_document.is_active


@pytest.mark.django_db
class TestPromptTemplateAPI:
    """Test Prompt Template API endpoints with pytest"""
    
    def test_list_templates(self, authenticated_api_client, prompt_template):
        """Test listing prompt templates"""
        response = authenticated_api_client.get(reverse('prompt_templates_list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        assert response.data[0]['name'] == prompt_template.name
        
    @pytest.mark.parametrize("template_data", [
        {
            'name': 'simple_template',
            'system_prompt': 'You are helpful',
            'description': '',
            'examples': []
        },
        {
            'name': 'complex_template',
            'system_prompt': 'You are an expert',
            'description': 'Expert assistant template',
            'examples': [
                {'user': 'Help me', 'assistant': 'I can help!'}
            ]
        },
    ])
    def test_create_template(self, authenticated_api_client, template_data):
        """Test creating prompt template"""
        response = authenticated_api_client.post(
            reverse('prompt_templates_list'),
            template_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == template_data['name']
        assert response.data['system_prompt'] == template_data['system_prompt']
        assert len(response.data['examples']) == len(template_data['examples'])
        
    def test_template_name_uniqueness(self, authenticated_api_client, prompt_template):
        """Test template name must be unique"""
        response = authenticated_api_client.post(
            reverse('prompt_templates_list'),
            {
                'name': prompt_template.name,
                'system_prompt': 'Another prompt'
            },
            format='json'
        )
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
    def test_update_template(self, authenticated_api_client, prompt_template):
        """Test updating prompt template"""
        update_data = {
            'description': 'Updated description',
            'examples': [
                {'user': 'Q1', 'assistant': 'A1'},
                {'user': 'Q2', 'assistant': 'A2'}
            ]
        }
        
        response = authenticated_api_client.put(
            reverse('prompt_template_detail', args=[prompt_template.id]),
            update_data,
            format='json'
        )
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data['description'] == 'Updated description'
        assert len(response.data['examples']) == 2