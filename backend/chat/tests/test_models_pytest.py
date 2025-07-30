"""
Optimized model tests using pytest
"""
import pytest
from django.db import IntegrityError
from chat.models import ChatSession, Message, RAGDocument, PromptTemplate


@pytest.mark.django_db
class TestUserModel:
    """Test custom User model with pytest"""
    
    def test_create_user_without_password(self, user):
        """Test creating a user with username only"""
        assert user.username == 'testuser'
        assert user.password is None
        assert user.is_active
        
    def test_username_uniqueness(self, user):
        """Test username must be unique"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        with pytest.raises(IntegrityError):
            User.objects.create(username='testuser')
    
    @pytest.mark.parametrize("username,expected", [
        ("user123", "user123"),
        ("test_user", "test_user"),
        ("email@example.com", "email@example.com"),
    ])
    def test_various_usernames(self, db, username, expected):
        """Test creating users with various username formats"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        user = User.objects.create_user(username=username)
        assert user.username == expected


@pytest.mark.django_db
class TestChatSessionModel:
    """Test ChatSession model with pytest"""
    
    def test_create_session(self, user):
        """Test creating a chat session"""
        session = ChatSession.objects.create(
            user=user,
            title='Test Chat'
        )
        assert session.user == user
        assert session.title == 'Test Chat'
        assert session.is_active
        assert session.settings == {}
        
    def test_session_default_settings(self, chat_session):
        """Test session settings with defaults"""
        settings = chat_session.get_settings()
        assert settings['temperature'] == 0.7
        assert settings['max_tokens'] == 512
        assert settings['system_prompt'] is None
        assert settings['prompt_template'] == 'default'
        
    @pytest.mark.parametrize("custom_settings,expected_temp", [
        ({'temperature': 0.5}, 0.5),
        ({'temperature': 1.0}, 1.0),
        ({}, 0.7),  # default
    ])
    def test_session_custom_settings(self, user, custom_settings, expected_temp):
        """Test session with various custom settings"""
        session = ChatSession.objects.create(
            user=user,
            settings=custom_settings
        )
        assert session.get_settings()['temperature'] == expected_temp
        
    def test_session_ordering(self, user):
        """Test sessions are ordered by updated_at desc"""
        session1 = ChatSession.objects.create(user=user, title='Session 1')
        session2 = ChatSession.objects.create(user=user, title='Session 2')
        
        sessions = list(ChatSession.objects.all())
        assert sessions[0] == session2  # Most recent first
        assert sessions[1] == session1
    
    def test_session_str_representation(self, chat_session):
        """Test string representation of session"""
        expected = f"{chat_session.user.username} - {chat_session.title}"
        assert str(chat_session) == expected


@pytest.mark.django_db
class TestMessageModel:
    """Test Message model with pytest"""
    
    @pytest.mark.parametrize("role,content,rag_context", [
        ("user", "Hello AI", None),
        ("assistant", "Hello! How can I help?", "Some context"),
        ("system", "You are now in debug mode", None),
    ])
    def test_create_messages(self, chat_session, role, content, rag_context):
        """Test creating messages with different roles"""
        message = Message.objects.create(
            session=chat_session,
            role=role,
            content=content,
            rag_context=rag_context
        )
        
        assert message.session == chat_session
        assert message.role == role
        assert message.content == content
        assert message.rag_context == rag_context
        
    def test_message_ordering(self, chat_session):
        """Test messages are ordered by created_at"""
        msg1 = Message.objects.create(
            session=chat_session,
            role='user',
            content='First'
        )
        msg2 = Message.objects.create(
            session=chat_session,
            role='assistant',
            content='Second'
        )
        
        messages = list(Message.objects.all())
        assert messages[0] == msg1
        assert messages[1] == msg2
        
    def test_message_metadata(self, chat_session):
        """Test message metadata storage"""
        metadata = {'tokens': 150, 'model': 'mistral-7b'}
        message = Message.objects.create(
            session=chat_session,
            role='assistant',
            content='Response',
            metadata=metadata
        )
        
        assert message.metadata == metadata
        
    def test_message_str_representation(self, message):
        """Test string representation of message"""
        assert str(message).startswith(f"{message.role}:")
        assert "Test message" in str(message)


@pytest.mark.django_db
class TestRAGDocumentModel:
    """Test RAGDocument model with pytest"""
    
    def test_create_document(self, user):
        """Test creating RAG document"""
        doc = RAGDocument.objects.create(
            title='Test Document',
            content='This is test content',
            source_type='text',
            added_by=user,
            tags=['test', 'demo']
        )
        
        assert doc.title == 'Test Document'
        assert doc.source_type == 'text'
        assert doc.tags == ['test', 'demo']
        assert doc.is_active
        assert doc.added_by == user
        
    @pytest.mark.parametrize("source_type,source_path", [
        ("upload", "/path/to/file.txt"),
        ("text", None),
        ("url", "https://example.com/doc"),
    ])
    def test_document_sources(self, user, source_type, source_path):
        """Test documents with different source types"""
        doc = RAGDocument.objects.create(
            title=f"Doc from {source_type}",
            content="Content",
            source_type=source_type,
            source_path=source_path,
            added_by=user
        )
        
        assert doc.source_type == source_type
        assert doc.source_path == source_path
        
    def test_document_metadata(self, rag_document):
        """Test document metadata storage"""
        metadata = {'author': 'John', 'version': '1.0', 'language': 'en'}
        rag_document.metadata = metadata
        rag_document.save()
        
        rag_document.refresh_from_db()
        assert rag_document.metadata == metadata
        
    def test_document_soft_delete(self, rag_document):
        """Test soft deleting a document"""
        assert rag_document.is_active
        
        rag_document.is_active = False
        rag_document.save()
        
        assert not rag_document.is_active
        assert RAGDocument.objects.filter(id=rag_document.id).exists()


@pytest.mark.django_db
class TestPromptTemplateModel:
    """Test PromptTemplate model with pytest"""
    
    def test_create_template(self, user):
        """Test creating prompt template"""
        template = PromptTemplate.objects.create(
            name='test_template',
            description='Test template',
            system_prompt='You are a helpful assistant',
            created_by=user
        )
        
        assert template.name == 'test_template'
        assert template.is_active
        assert template.examples == []
        assert template.created_by == user
        
    def test_add_example(self, prompt_template):
        """Test adding examples to template"""
        initial_count = len(prompt_template.examples)
        
        prompt_template.add_example(
            user_input='How are you?',
            assistant_response='I am doing well, thank you!'
        )
        
        assert len(prompt_template.examples) == initial_count + 1
        assert prompt_template.examples[-1]['user'] == 'How are you?'
        assert prompt_template.examples[-1]['assistant'] == 'I am doing well, thank you!'
        
    @pytest.mark.parametrize("examples", [
        [],
        [{'user': 'Hi', 'assistant': 'Hello!'}],
        [
            {'user': 'Hi', 'assistant': 'Hello!'},
            {'user': 'How are you?', 'assistant': 'I am fine!'}
        ],
    ])
    def test_template_with_examples(self, user, examples):
        """Test templates with different example sets"""
        template = PromptTemplate.objects.create(
            name=f'template_with_{len(examples)}_examples',
            system_prompt='Test prompt',
            examples=examples,
            created_by=user
        )
        
        assert len(template.examples) == len(examples)
        
    def test_template_name_uniqueness(self, prompt_template):
        """Test template name must be unique"""
        with pytest.raises(IntegrityError):
            PromptTemplate.objects.create(
                name=prompt_template.name,
                system_prompt='Another prompt'
            )
            
    def test_template_str_representation(self, prompt_template):
        """Test string representation of template"""
        assert str(prompt_template) == prompt_template.name