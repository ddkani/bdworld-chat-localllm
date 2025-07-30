"""
Optimized WebSocket tests using pytest
"""
import pytest
import json
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from chat.consumers import ChatConsumer
from chat.models import ChatSession, Message, User
from django.contrib.auth.models import AnonymousUser
from django.test import TransactionTestCase


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
@pytest.mark.websocket
class TestWebSocketConnection:
    """Test WebSocket connection handling"""
    
    async def test_authenticated_connection(self, user):
        """Test authenticated WebSocket connection"""
        # Create session
        session = await database_sync_to_async(ChatSession.objects.create)(
            user=user,
            title='Test Session'
        )
        
        # Test directly with the consumer
        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(),
            f"/ws/chat/{session.id}/"
        )
        communicator.scope['user'] = user
        communicator.scope['url_route'] = {'kwargs': {'session_id': str(session.id)}}
        
        connected, subprotocol = await communicator.connect()
        assert connected, f"WebSocket connection failed: {subprotocol}"
        
        # Should receive session info
        response = await communicator.receive_json_from()
        assert response['type'] == 'session_info'
        assert response['session']['id'] == str(session.id)
        assert response['session']['title'] == 'Test Session'
        
        # Should receive history (empty)
        response = await communicator.receive_json_from()
        assert response['type'] == 'history'
        assert response['messages'] == []
        
        await communicator.disconnect()
        
    async def test_unauthenticated_connection(self):
        """Test unauthenticated WebSocket connection is rejected"""
        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(),
            "/ws/chat/123/"
        )
        communicator.scope['user'] = AnonymousUser()
        communicator.scope['url_route'] = {'kwargs': {'session_id': '123'}}
        
        connected, _ = await communicator.connect()
        assert not connected
        
    async def test_invalid_session_connection(self, user):
        """Test connection to non-existent session"""
        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(),
            "/ws/chat/99999/"
        )
        communicator.scope['user'] = user
        communicator.scope['url_route'] = {'kwargs': {'session_id': '99999'}}
        
        connected, _ = await communicator.connect()
        assert not connected
        
    async def test_new_session_creation(self, user):
        """Test creating new session via WebSocket"""
        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(),
            "/ws/chat/new/"
        )
        communicator.scope['user'] = user
        communicator.scope['url_route'] = {'kwargs': {'session_id': 'new'}}
        
        connected, _ = await communicator.connect()
        assert connected
        
        # Should receive session info for new session
        response = await communicator.receive_json_from()
        assert response['type'] == 'session_info'
        assert 'id' in response['session']
        assert response['session']['title'] == 'New Chat'
        
        await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
@pytest.mark.websocket
class TestWebSocketMessaging:
    """Test WebSocket message handling"""
    
    async def test_send_message(self, websocket_communicator):
        """Test sending a message through WebSocket"""
        connected, _ = await websocket_communicator.connect()
        assert connected
        
        # Skip initial messages
        await websocket_communicator.receive_json_from()  # session_info
        await websocket_communicator.receive_json_from()  # history
        
        # Send user message
        await websocket_communicator.send_json_to({
            'type': 'message',
            'content': 'Hello AI',
            'use_rag': False
        })
        
        # Should receive user message echo
        response = await websocket_communicator.receive_json_from()
        assert response['type'] == 'message'
        assert response['message']['role'] == 'user'
        assert response['message']['content'] == 'Hello AI'
        assert 'id' in response['message']
        assert 'created_at' in response['message']
        
    @pytest.mark.parametrize("message_content,use_rag", [
        ("Simple message", False),
        ("Message with RAG", True),
        ("Multi-line\nmessage", False),
        ("🚀 Unicode message", False),
    ])
    async def test_message_variations(self, websocket_communicator, message_content, use_rag):
        """Test sending various message types"""
        connected, _ = await websocket_communicator.connect()
        assert connected
        
        # Skip initial messages
        await websocket_communicator.receive_json_from()
        await websocket_communicator.receive_json_from()
        
        # Send message
        await websocket_communicator.send_json_to({
            'type': 'message',
            'content': message_content,
            'use_rag': use_rag
        })
        
        # Verify echo
        response = await websocket_communicator.receive_json_from()
        assert response['type'] == 'message'
        assert response['message']['content'] == message_content
        
    async def test_empty_message_rejected(self, websocket_communicator):
        """Test empty messages are rejected"""
        connected, _ = await websocket_communicator.connect()
        assert connected
        
        # Skip initial messages
        await websocket_communicator.receive_json_from()
        await websocket_communicator.receive_json_from()
        
        # Send empty message
        await websocket_communicator.send_json_to({
            'type': 'message',
            'content': '',
            'use_rag': False
        })
        
        # Should receive error
        response = await websocket_communicator.receive_json_from()
        assert response['type'] == 'error'
        assert 'empty' in response['error'].lower()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
@pytest.mark.websocket
class TestWebSocketSettings:
    """Test WebSocket settings management"""
    
    @pytest.mark.parametrize("settings_update", [
        {'temperature': 0.5},
        {'max_tokens': 256},
        {'temperature': 1.0, 'max_tokens': 1024},
        {'system_prompt': 'You are a pirate'},
        {'prompt_template': 'custom_template'},
    ])
    async def test_update_settings(self, websocket_communicator, settings_update):
        """Test updating various session settings"""
        connected, _ = await websocket_communicator.connect()
        assert connected
        
        # Skip initial messages
        await websocket_communicator.receive_json_from()
        await websocket_communicator.receive_json_from()
        
        # Update settings
        await websocket_communicator.send_json_to({
            'type': 'update_settings',
            'settings': settings_update
        })
        
        # Should receive confirmation
        response = await websocket_communicator.receive_json_from()
        assert response['type'] == 'settings_updated'
        
        # Verify settings were updated
        for key, value in settings_update.items():
            assert response['settings'][key] == value
            
    @pytest.mark.parametrize("invalid_settings", [
        {'temperature': -1},  # Below valid range
        {'temperature': 3},   # Above valid range
        {'max_tokens': 0},    # Too low
        {'max_tokens': 10000},  # Too high
    ])
    async def test_invalid_settings_ignored(self, websocket_communicator, invalid_settings):
        """Test invalid settings are ignored"""
        connected, _ = await websocket_communicator.connect()
        assert connected
        
        # Skip initial messages
        await websocket_communicator.receive_json_from()
        await websocket_communicator.receive_json_from()
        
        # Update with invalid settings
        await websocket_communicator.send_json_to({
            'type': 'update_settings',
            'settings': invalid_settings
        })
        
        # Should receive response but invalid values ignored
        response = await websocket_communicator.receive_json_from()
        assert response['type'] == 'settings_updated'
        
        # Invalid settings should not be applied
        for key in invalid_settings:
            # Should have default values, not the invalid ones
            assert response['settings'][key] != invalid_settings[key]


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
@pytest.mark.websocket
class TestWebSocketTitleUpdate:
    """Test WebSocket title update functionality"""
    
    @pytest.mark.parametrize("new_title", [
        "Updated Title",
        "Chat about Python",
        "🤖 AI Assistant",
        "A" * 255,  # Max length
    ])
    async def test_update_title(self, websocket_communicator, new_title):
        """Test updating session title"""
        connected, _ = await websocket_communicator.connect()
        assert connected
        
        # Skip initial messages
        await websocket_communicator.receive_json_from()
        await websocket_communicator.receive_json_from()
        
        # Update title
        await websocket_communicator.send_json_to({
            'type': 'update_title',
            'title': new_title
        })
        
        # Should receive confirmation
        response = await websocket_communicator.receive_json_from()
        assert response['type'] == 'title_updated'
        assert response['title'] == new_title
        
    async def test_empty_title_rejected(self, websocket_communicator):
        """Test empty title is rejected"""
        connected, _ = await websocket_communicator.connect()
        assert connected
        
        # Skip initial messages
        await websocket_communicator.receive_json_from()
        await websocket_communicator.receive_json_from()
        
        # Try to set empty title
        await websocket_communicator.send_json_to({
            'type': 'update_title',
            'title': ''
        })
        
        # Should receive error
        response = await websocket_communicator.receive_json_from()
        assert response['type'] == 'error'
        assert 'empty' in response['error'].lower()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
@pytest.mark.websocket
class TestWebSocketHistory:
    """Test WebSocket message history"""
    
    async def test_receive_message_history(self, user):
        """Test receiving message history on connect"""
        # Create session with messages
        session = await database_sync_to_async(ChatSession.objects.create)(
            user=user,
            title='Session with History'
        )
        
        # Create messages
        await database_sync_to_async(Message.objects.create)(
            session=session,
            role='user',
            content='Previous question'
        )
        await database_sync_to_async(Message.objects.create)(
            session=session,
            role='assistant',
            content='Previous answer'
        )
        
        # Connect to WebSocket
        communicator = WebsocketCommunicator(
            ChatConsumer.as_asgi(),
            f"/ws/chat/{session.id}/"
        )
        communicator.scope['user'] = user
        communicator.scope['url_route'] = {'kwargs': {'session_id': str(session.id)}}
        
        connected, _ = await communicator.connect()
        assert connected
        
        # Skip session info
        await communicator.receive_json_from()
        
        # Should receive history
        response = await communicator.receive_json_from()
        assert response['type'] == 'history'
        assert len(response['messages']) == 2
        assert response['messages'][0]['content'] == 'Previous question'
        assert response['messages'][0]['role'] == 'user'
        assert response['messages'][1]['content'] == 'Previous answer'
        assert response['messages'][1]['role'] == 'assistant'
        
        await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
@pytest.mark.websocket
class TestWebSocketErrors:
    """Test WebSocket error handling"""
    
    async def test_invalid_message_type(self, websocket_communicator):
        """Test handling invalid message type"""
        connected, _ = await websocket_communicator.connect()
        assert connected
        
        # Skip initial messages
        await websocket_communicator.receive_json_from()
        await websocket_communicator.receive_json_from()
        
        # Send invalid message type
        await websocket_communicator.send_json_to({
            'type': 'invalid_type',
            'data': 'test'
        })
        
        # Should receive error
        response = await websocket_communicator.receive_json_from()
        assert response['type'] == 'error'
        assert 'Unknown message type' in response['error']
        
    async def test_malformed_json(self, websocket_communicator):
        """Test handling malformed JSON"""
        connected, _ = await websocket_communicator.connect()
        assert connected
        
        # Skip initial messages
        await websocket_communicator.receive_json_from()
        await websocket_communicator.receive_json_from()
        
        # Send malformed JSON
        await websocket_communicator.send_to('{"invalid": json}')
        
        # Should receive error
        response = await websocket_communicator.receive_json_from()
        assert response['type'] == 'error'
        assert 'Invalid JSON' in response['error']