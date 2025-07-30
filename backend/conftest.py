"""
Global pytest configuration and fixtures
"""
import pytest
import pytest_asyncio
import asyncio
from typing import AsyncGenerator, Generator
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from chat_project.asgi import application
import tempfile
import os
from pathlib import Path

# Configure pytest-django
pytest_plugins = ['pytest_django']

User = get_user_model()


# Event loop configuration for async tests
@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    policy = asyncio.get_event_loop_policy()
    loop = policy.new_event_loop()
    yield loop
    loop.close()


# Database fixtures
@pytest.fixture
def db_access_without_rollback(db):
    """
    This fixture allows database access and commits changes.
    Useful for tests that need to verify database state across transactions.
    """
    pass


@pytest.fixture
def user(db) -> User:
    """Create a test user"""
    return User.objects.create_user(username='testuser')


@pytest.fixture
def another_user(db) -> User:
    """Create another test user"""
    return User.objects.create_user(username='anotheruser')


@pytest.fixture
def api_client() -> APIClient:
    """Create an API client"""
    return APIClient()


@pytest.fixture
def authenticated_api_client(user, api_client) -> APIClient:
    """Create an authenticated API client"""
    api_client.force_authenticate(user=user)
    return api_client


# WebSocket fixtures
@pytest_asyncio.fixture
async def websocket_communicator(user) -> AsyncGenerator[WebsocketCommunicator, None]:
    """Create a WebSocket communicator for testing"""
    from channels.db import database_sync_to_async
    from chat.models import ChatSession
    from chat.consumers import ChatConsumer
    
    # Create session using database_sync_to_async
    session = await database_sync_to_async(ChatSession.objects.create)(
        user=user,
        title='Test Session'
    )
    
    # Create communicator with proper scope
    communicator = WebsocketCommunicator(
        ChatConsumer.as_asgi(),
        f"/ws/chat/{session.id}/"
    )
    
    # Set up the scope to simulate authenticated user
    communicator.scope['user'] = user
    communicator.scope['url_route'] = {'kwargs': {'session_id': str(session.id)}}
    
    yield communicator
    
    await communicator.disconnect()


# Model fixtures
@pytest.fixture
def chat_session(user):
    """Create a test chat session"""
    from chat.models import ChatSession
    return ChatSession.objects.create(
        user=user,
        title='Test Chat Session'
    )


@pytest.fixture
def message(chat_session):
    """Create a test message"""
    from chat.models import Message
    return Message.objects.create(
        session=chat_session,
        role='user',
        content='Test message'
    )


@pytest.fixture
def rag_document(user):
    """Create a test RAG document"""
    from chat.models import RAGDocument
    return RAGDocument.objects.create(
        title='Test Document',
        content='Test content for RAG',
        source_type='text',
        added_by=user,
        tags=['test', 'fixture']
    )


@pytest.fixture
def prompt_template(user):
    """Create a test prompt template"""
    from chat.models import PromptTemplate
    return PromptTemplate.objects.create(
        name='test_template',
        description='Test template',
        system_prompt='You are a test assistant',
        created_by=user,
        examples=[
            {'user': 'Hello', 'assistant': 'Hi there!'}
        ]
    )


# File fixtures
@pytest.fixture
def temp_file() -> Generator[Path, None, None]:
    """Create a temporary file"""
    with tempfile.NamedTemporaryFile(mode='w', delete=False) as f:
        f.write("Test content")
        temp_path = Path(f.name)
    
    yield temp_path
    
    if temp_path.exists():
        temp_path.unlink()


@pytest.fixture
def temp_json_file() -> Generator[Path, None, None]:
    """Create a temporary JSON file"""
    import json
    
    data = [
        {'title': 'Doc 1', 'content': 'Content 1'},
        {'title': 'Doc 2', 'content': 'Content 2'}
    ]
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(data, f)
        temp_path = Path(f.name)
    
    yield temp_path
    
    if temp_path.exists():
        temp_path.unlink()


@pytest.fixture
def temp_db() -> Generator[str, None, None]:
    """Create a temporary database file"""
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = f.name
    
    yield db_path
    
    if os.path.exists(db_path):
        os.unlink(db_path)


# Mock fixtures
@pytest.fixture
def mock_llama(mocker):
    """Mock the Llama model"""
    mock = mocker.patch('llm.llm_service.Llama')
    mock_instance = mocker.Mock()
    mock.return_value = mock_instance
    
    # Mock streaming response
    mock_instance.return_value = iter([
        {'choices': [{'text': 'Hello'}]},
        {'choices': [{'text': ' world'}]},
        {'choices': [{'text': '!'}]}
    ])
    
    return mock_instance


@pytest.fixture
def mock_embedding(mocker):
    """Mock embedding generation"""
    import numpy as np
    mock = mocker.patch('llm.llm_service.LLMService.generate_embedding')
    mock.return_value = np.random.rand(384)
    return mock


@pytest.fixture
def mock_requests_get(mocker):
    """Mock requests.get"""
    mock = mocker.patch('requests.get')
    mock_response = mocker.Mock()
    mock_response.text = 'Mocked web content'
    mock_response.raise_for_status = mocker.Mock()
    mock.return_value = mock_response
    return mock


# Settings override fixtures
@pytest.fixture(autouse=True)
def use_test_settings(settings):
    """Automatically use test settings"""
    settings.DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
    settings.CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer'
        }
    }
    settings.LOGGING['root']['handlers'] = ['null']
    
    # Set test environment variables
    os.environ['MODEL_PATH'] = 'test_model.gguf'
    os.environ['MODEL_MAX_TOKENS'] = '128'
    os.environ['MODEL_TEMPERATURE'] = '0.7'
    os.environ['MODEL_THREADS'] = '2'


# Markers for organizing tests
def pytest_configure(config):
    """Configure custom markers"""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )
    config.addinivalue_line(
        "markers", "websocket: mark test as requiring websocket support"
    )
    config.addinivalue_line(
        "markers", "llm: mark test as requiring LLM functionality"
    )