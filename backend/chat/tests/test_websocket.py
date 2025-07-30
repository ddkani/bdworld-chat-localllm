from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from chat_project.asgi import application
from chat.models import ChatSession, Message
import json
import asyncio
import pytest

User = get_user_model()


@pytest.mark.websocket
class WebSocketTest(TransactionTestCase):
    """Test WebSocket chat functionality"""
    
    def setUp(self):
        """Set up test data"""
        # Skip all tests in this class
        self.skipTest("Old WebSocket tests - use test_websocket_pytest.py instead")
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)
        
    def tearDown(self):
        """Clean up event loop"""
        self.loop.close()
        
    async def create_test_user(self):
        """Create test user"""
        return await database_sync_to_async(User.objects.create_user)('testuser')
        
    async def create_test_session(self, user):
        """Create test session"""
        return await database_sync_to_async(ChatSession.objects.create)(
            user=user,
            title='Test Session'
        )
        
    def test_websocket_connect_authenticated(self):
        """Test authenticated WebSocket connection"""
        async def test():
            user = await self.create_test_user()
            session = await self.create_test_session(user)
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/chat/{session.id}/"
            )
            
            # Add user to scope
            communicator.scope['user'] = user
            
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            
            # Should receive session info
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'session_info')
            self.assertEqual(response['session']['id'], str(session.id))
            
            # Should receive history (empty)
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'history')
            self.assertEqual(response['messages'], [])
            
            await communicator.disconnect()
            
        self.loop.run_until_complete(test())
        
    def test_websocket_connect_unauthenticated(self):
        """Test unauthenticated WebSocket connection"""
        async def test():
            from django.contrib.auth.models import AnonymousUser
            
            communicator = WebsocketCommunicator(
                application,
                "/ws/chat/123/"
            )
            
            # Set anonymous user
            communicator.scope['user'] = AnonymousUser()
            
            connected, _ = await communicator.connect()
            self.assertFalse(connected)
            
        self.loop.run_until_complete(test())
        
    def test_send_message(self):
        """Test sending a message through WebSocket"""
        async def test():
            user = await self.create_test_user()
            session = await self.create_test_session(user)
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/chat/{session.id}/"
            )
            communicator.scope['user'] = user
            
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            
            # Skip initial messages
            await communicator.receive_json_from()  # session_info
            await communicator.receive_json_from()  # history
            
            # Send user message
            await communicator.send_json_to({
                'type': 'message',
                'content': 'Hello AI',
                'use_rag': False
            })
            
            # Should receive user message echo
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'message')
            self.assertEqual(response['message']['role'], 'user')
            self.assertEqual(response['message']['content'], 'Hello AI')
            
            # Note: In tests, LLM response won't work without mock
            # You would need to mock the LLM service for full testing
            
            await communicator.disconnect()
            
        self.loop.run_until_complete(test())
        
    def test_update_settings(self):
        """Test updating session settings"""
        async def test():
            user = await self.create_test_user()
            session = await self.create_test_session(user)
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/chat/{session.id}/"
            )
            communicator.scope['user'] = user
            
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            
            # Skip initial messages
            await communicator.receive_json_from()  # session_info
            await communicator.receive_json_from()  # history
            
            # Update settings
            await communicator.send_json_to({
                'type': 'update_settings',
                'settings': {
                    'temperature': 0.5,
                    'max_tokens': 256
                }
            })
            
            # Should receive confirmation
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'settings_updated')
            self.assertEqual(response['settings']['temperature'], 0.5)
            self.assertEqual(response['settings']['max_tokens'], 256)
            
            await communicator.disconnect()
            
        self.loop.run_until_complete(test())
        
    def test_update_title(self):
        """Test updating session title"""
        async def test():
            user = await self.create_test_user()
            session = await self.create_test_session(user)
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/chat/{session.id}/"
            )
            communicator.scope['user'] = user
            
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            
            # Skip initial messages
            await communicator.receive_json_from()  # session_info
            await communicator.receive_json_from()  # history
            
            # Update title
            await communicator.send_json_to({
                'type': 'update_title',
                'title': 'New Title'
            })
            
            # Should receive confirmation
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'title_updated')
            self.assertEqual(response['title'], 'New Title')
            
            await communicator.disconnect()
            
        self.loop.run_until_complete(test())
        
    def test_invalid_message_type(self):
        """Test handling invalid message type"""
        async def test():
            user = await self.create_test_user()
            session = await self.create_test_session(user)
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/chat/{session.id}/"
            )
            communicator.scope['user'] = user
            
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            
            # Skip initial messages
            await communicator.receive_json_from()  # session_info
            await communicator.receive_json_from()  # history
            
            # Send invalid message type
            await communicator.send_json_to({
                'type': 'invalid_type',
                'data': 'test'
            })
            
            # Should receive error
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'error')
            self.assertIn('Unknown message type', response['error'])
            
            await communicator.disconnect()
            
        self.loop.run_until_complete(test())
        
    def test_message_history(self):
        """Test receiving message history on connect"""
        async def test():
            user = await self.create_test_user()
            session = await self.create_test_session(user)
            
            # Create some messages
            await database_sync_to_async(Message.objects.create)(
                session=session,
                role='user',
                content='Previous message'
            )
            await database_sync_to_async(Message.objects.create)(
                session=session,
                role='assistant',
                content='Previous response'
            )
            
            communicator = WebsocketCommunicator(
                application,
                f"/ws/chat/{session.id}/"
            )
            communicator.scope['user'] = user
            
            connected, _ = await communicator.connect()
            self.assertTrue(connected)
            
            # Skip session info
            await communicator.receive_json_from()
            
            # Should receive history
            response = await communicator.receive_json_from()
            self.assertEqual(response['type'], 'history')
            self.assertEqual(len(response['messages']), 2)
            self.assertEqual(response['messages'][0]['content'], 'Previous message')
            self.assertEqual(response['messages'][1]['content'], 'Previous response')
            
            await communicator.disconnect()
            
        self.loop.run_until_complete(test())