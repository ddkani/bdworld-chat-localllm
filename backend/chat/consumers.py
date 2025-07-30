import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import ChatSession, Message, PromptTemplate
from llm.llm_service import LLMService, RAGService
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for handling chat connections"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session_id = None
        self.chat_session = None
        self.user = None
        self.llm_service = LLMService()
        self.rag_service = RAGService()
        
    async def connect(self):
        """Handle WebSocket connection"""
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.user = self.scope['user']
        
        if not self.user.is_authenticated:
            await self.close()
            return
            
        # Get or create chat session
        self.chat_session = await self.get_or_create_session()
        
        if not self.chat_session:
            await self.close()
            return
            
        # Accept the connection
        await self.accept()
        
        # Send session info
        await self.send(json.dumps({
            'type': 'session_info',
            'session': {
                'id': str(self.chat_session.id),
                'title': self.chat_session.title,
                'settings': self.chat_session.get_settings()
            }
        }))
        
        # Send chat history
        messages = await self.get_session_messages()
        await self.send(json.dumps({
            'type': 'history',
            'messages': messages
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        logger.info(f"WebSocket disconnected: {close_code}")
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'message':
                await self.handle_chat_message(data)
            elif message_type == 'update_settings':
                await self.handle_settings_update(data)
            elif message_type == 'update_title':
                await self.handle_title_update(data)
            else:
                await self.send_error(f"알 수 없는 메시지 유형: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error("잘못된 JSON 형식")
        except Exception as e:
            logger.error(f"Error in receive: {e}")
            await self.send_error("서버 내부 오류")
    
    async def handle_chat_message(self, data):
        """Handle incoming chat messages"""
        content = data.get('content', '').strip()
        
        if not content:
            await self.send_error("메시지 내용은 비어있을 수 없습니다")
            return
        
        # Save user message
        user_message = await self.create_message('user', content)
        
        # Send acknowledgment
        await self.send(json.dumps({
            'type': 'message',
            'message': {
                'id': user_message.id,
                'role': 'user',
                'content': content,
                'created_at': user_message.created_at.isoformat()
            }
        }))
        
        # Get session settings
        settings = self.chat_session.get_settings()
        
        # Check if RAG is enabled
        use_rag = data.get('use_rag', False)
        rag_context = None
        
        if use_rag:
            # Get relevant context from RAG
            rag_context = await database_sync_to_async(self.rag_service.get_context)(content)
        
        # Get prompt template
        system_prompt = settings.get('system_prompt')
        template_name = settings.get('prompt_template', 'default')
        
        if template_name != 'default':
            template = await self.get_prompt_template(template_name)
            if template:
                system_prompt = template.system_prompt
        
        # Start streaming response
        await self.send(json.dumps({
            'type': 'stream_start',
            'message': {
                'role': 'assistant'
            }
        }))
        
        # Generate and stream response
        full_response = ""
        try:
            async for token in self.llm_service.generate_streaming(
                prompt=content,
                max_tokens=settings.get('max_tokens', 512),
                temperature=settings.get('temperature', 0.7),
                system_prompt=system_prompt,
                rag_context=rag_context
            ):
                full_response += token
                await self.send(json.dumps({
                    'type': 'stream_token',
                    'token': token
                }))
                # Force flush to ensure immediate sending
                await asyncio.sleep(0)
            
            # Save assistant message
            assistant_message = await self.create_message(
                'assistant', 
                full_response,
                metadata={'rag_used': use_rag},
                rag_context=rag_context
            )
            
            # Send stream end
            await self.send(json.dumps({
                'type': 'stream_end',
                'message': {
                    'id': assistant_message.id,
                    'role': 'assistant',
                    'content': full_response,
                    'created_at': assistant_message.created_at.isoformat(),
                    'rag_context': rag_context
                }
            }))
            
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            await self.send(json.dumps({
                'type': 'stream_error',
                'error': str(e)
            }))
    
    async def handle_settings_update(self, data):
        """Handle session settings update"""
        settings = data.get('settings', {})
        
        # Validate settings
        valid_settings = {}
        if 'temperature' in settings:
            temp = float(settings['temperature'])
            if 0 <= temp <= 2:
                valid_settings['temperature'] = temp
                
        if 'max_tokens' in settings:
            tokens = int(settings['max_tokens'])
            if 1 <= tokens <= 4096:
                valid_settings['max_tokens'] = tokens
                
        if 'system_prompt' in settings:
            valid_settings['system_prompt'] = settings['system_prompt']
            
        if 'prompt_template' in settings:
            valid_settings['prompt_template'] = settings['prompt_template']
        
        # Update session settings
        await self.update_session_settings(valid_settings)
        
        # Send confirmation
        await self.send(json.dumps({
            'type': 'settings_updated',
            'settings': self.chat_session.get_settings()
        }))
    
    async def handle_title_update(self, data):
        """Handle session title update"""
        title = data.get('title', '').strip()
        
        if not title:
            await self.send_error("제목은 비어있을 수 없습니다")
            return
        
        # Update session title
        await self.update_session_title(title)
        
        # Send confirmation
        await self.send(json.dumps({
            'type': 'title_updated',
            'title': title
        }))
    
    async def send_error(self, error_message):
        """Send error message to client"""
        await self.send(json.dumps({
            'type': 'error',
            'error': error_message
        }))
    
    # Database operations
    @database_sync_to_async
    def get_or_create_session(self):
        """Get existing session or create new one"""
        try:
            if self.session_id == 'new':
                # Create new session
                return ChatSession.objects.create(
                    user=self.user,
                    title='New Chat'
                )
            else:
                # Get existing session
                return ChatSession.objects.get(
                    id=self.session_id,
                    user=self.user
                )
        except ChatSession.DoesNotExist:
            return None
        except Exception as e:
            logger.error(f"Error getting session: {e}")
            return None
    
    @database_sync_to_async
    def get_session_messages(self):
        """Get all messages for the session"""
        messages = self.chat_session.messages.all()
        return [
            {
                'id': msg.id,
                'role': msg.role,
                'content': msg.content,
                'created_at': msg.created_at.isoformat(),
                'rag_context': msg.rag_context
            }
            for msg in messages
        ]
    
    @database_sync_to_async
    def create_message(self, role, content, metadata=None, rag_context=None):
        """Create a new message in the database"""
        return Message.objects.create(
            session=self.chat_session,
            role=role,
            content=content,
            metadata=metadata or {},
            rag_context=rag_context
        )
    
    @database_sync_to_async
    def update_session_settings(self, settings):
        """Update session settings"""
        current_settings = self.chat_session.settings or {}
        current_settings.update(settings)
        self.chat_session.settings = current_settings
        self.chat_session.save()
    
    @database_sync_to_async
    def update_session_title(self, title):
        """Update session title"""
        self.chat_session.title = title
        self.chat_session.save()
    
    @database_sync_to_async
    def get_prompt_template(self, name):
        """Get prompt template by name"""
        try:
            return PromptTemplate.objects.get(name=name, is_active=True)
        except PromptTemplate.DoesNotExist:
            return None