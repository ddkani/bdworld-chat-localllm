from django.test import TestCase
from django.contrib.auth import get_user_model
from chat.models import ChatSession, Message, RAGDocument, PromptTemplate
import json

User = get_user_model()


class UserModelTest(TestCase):
    """Test custom User model"""
    
    def test_create_user_without_password(self):
        """Test creating a user with username only"""
        user = User.objects.create_user(username='testuser')
        self.assertEqual(user.username, 'testuser')
        self.assertIsNone(user.password)
        self.assertTrue(user.is_active)
        
    def test_username_uniqueness(self):
        """Test username must be unique"""
        User.objects.create_user(username='testuser')
        with self.assertRaises(Exception):
            User.objects.create_user(username='testuser')


class ChatSessionModelTest(TestCase):
    """Test ChatSession model"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser')
        
    def test_create_session(self):
        """Test creating a chat session"""
        session = ChatSession.objects.create(
            user=self.user,
            title='Test Chat'
        )
        self.assertEqual(session.user, self.user)
        self.assertEqual(session.title, 'Test Chat')
        self.assertTrue(session.is_active)
        self.assertEqual(session.settings, {})
        
    def test_session_settings(self):
        """Test session settings with defaults"""
        session = ChatSession.objects.create(
            user=self.user,
            settings={'temperature': 0.5}
        )
        settings = session.get_settings()
        self.assertEqual(settings['temperature'], 0.5)
        self.assertEqual(settings['max_tokens'], 512)  # default
        self.assertIsNone(settings['system_prompt'])  # default
        
    def test_session_ordering(self):
        """Test sessions are ordered by updated_at desc"""
        session1 = ChatSession.objects.create(user=self.user, title='Session 1')
        session2 = ChatSession.objects.create(user=self.user, title='Session 2')
        
        sessions = ChatSession.objects.all()
        self.assertEqual(sessions[0], session2)  # Most recent first


class MessageModelTest(TestCase):
    """Test Message model"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser')
        self.session = ChatSession.objects.create(user=self.user)
        
    def test_create_message(self):
        """Test creating messages"""
        user_msg = Message.objects.create(
            session=self.session,
            role='user',
            content='Hello AI'
        )
        
        assistant_msg = Message.objects.create(
            session=self.session,
            role='assistant',
            content='Hello! How can I help you?',
            rag_context='Some context'
        )
        
        self.assertEqual(user_msg.session, self.session)
        self.assertEqual(user_msg.role, 'user')
        self.assertEqual(assistant_msg.rag_context, 'Some context')
        
    def test_message_ordering(self):
        """Test messages are ordered by created_at"""
        msg1 = Message.objects.create(
            session=self.session,
            role='user',
            content='First'
        )
        msg2 = Message.objects.create(
            session=self.session,
            role='assistant',
            content='Second'
        )
        
        messages = Message.objects.all()
        self.assertEqual(messages[0], msg1)
        self.assertEqual(messages[1], msg2)


class RAGDocumentModelTest(TestCase):
    """Test RAGDocument model"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser')
        
    def test_create_document(self):
        """Test creating RAG document"""
        doc = RAGDocument.objects.create(
            title='Test Document',
            content='This is test content',
            source_type='text',
            added_by=self.user,
            tags=['test', 'demo']
        )
        
        self.assertEqual(doc.title, 'Test Document')
        self.assertEqual(doc.source_type, 'text')
        self.assertEqual(doc.tags, ['test', 'demo'])
        self.assertTrue(doc.is_active)
        
    def test_document_metadata(self):
        """Test document metadata storage"""
        metadata = {'author': 'John', 'version': '1.0'}
        doc = RAGDocument.objects.create(
            title='Test',
            content='Content',
            source_type='upload',
            metadata=metadata
        )
        
        self.assertEqual(doc.metadata, metadata)


class PromptTemplateModelTest(TestCase):
    """Test PromptTemplate model"""
    
    def setUp(self):
        self.user = User.objects.create_user(username='testuser')
        
    def test_create_template(self):
        """Test creating prompt template"""
        template = PromptTemplate.objects.create(
            name='test_template',
            description='Test template',
            system_prompt='You are a helpful assistant',
            created_by=self.user
        )
        
        self.assertEqual(template.name, 'test_template')
        self.assertTrue(template.is_active)
        self.assertEqual(template.examples, [])
        
    def test_add_example(self):
        """Test adding examples to template"""
        template = PromptTemplate.objects.create(
            name='test_template',
            system_prompt='Test prompt',
            created_by=self.user
        )
        
        template.add_example(
            user_input='How are you?',
            assistant_response='I am doing well, thank you!'
        )
        
        self.assertEqual(len(template.examples), 1)
        self.assertEqual(template.examples[0]['user'], 'How are you?')
        self.assertEqual(template.examples[0]['assistant'], 'I am doing well, thank you!')