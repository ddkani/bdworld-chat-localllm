from django.contrib.auth import authenticate, login, logout
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import ChatSession, Message, RAGDocument, PromptTemplate
from .serializers import (
    UserSerializer, ChatSessionSerializer, MessageSerializer,
    RAGDocumentSerializer, PromptTemplateSerializer
)
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """Simple username-only login"""
    username = request.data.get('username', '').strip()
    
    if not username:
        return Response(
            {'error': '사용자 이름이 필요합니다'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Authenticate user (creates if doesn't exist)
    user = authenticate(request, username=username)
    
    if user:
        login(request, user)
        return Response({
            'user': UserSerializer(user).data,
            'message': '로그인 성공'
        })
    else:
        return Response(
            {'error': '인증 실패'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout user"""
    logout(request)
    return Response({'message': '로그아웃 성공'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """Get current user info"""
    return Response({
        'user': UserSerializer(request.user).data
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def sessions_list(request):
    """List user's chat sessions or create new one"""
    if request.method == 'GET':
        sessions = ChatSession.objects.filter(
            user=request.user,
            is_active=True
        )
        serializer = ChatSessionSerializer(sessions, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        # Create new session
        session = ChatSession.objects.create(
            user=request.user,
            title=request.data.get('title', '새 대화')
        )
        serializer = ChatSessionSerializer(session)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    """Get, update or delete a specific session"""
    try:
        session = ChatSession.objects.get(
            id=session_id,
            user=request.user
        )
    except ChatSession.DoesNotExist:
        return Response(
            {'error': '세션을 찾을 수 없습니다'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = ChatSessionSerializer(session)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = ChatSessionSerializer(
            session,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    elif request.method == 'DELETE':
        # Soft delete
        session.is_active = False
        session.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_messages(request, session_id):
    """Get messages for a specific session"""
    try:
        session = ChatSession.objects.get(
            id=session_id,
            user=request.user
        )
    except ChatSession.DoesNotExist:
        return Response(
            {'error': '세션을 찾을 수 없습니다'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    messages = session.messages.all()
    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def rag_documents_list(request):
    """List RAG documents or add new one"""
    if request.method == 'GET':
        documents = RAGDocument.objects.filter(is_active=True)
        serializer = RAGDocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = RAGDocumentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(added_by=request.user)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def rag_document_detail(request, document_id):
    """Get, update or delete a specific RAG document"""
    try:
        document = RAGDocument.objects.get(id=document_id)
    except RAGDocument.DoesNotExist:
        return Response(
            {'error': '문서를 찾을 수 없습니다'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = RAGDocumentSerializer(document)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = RAGDocumentSerializer(
            document,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    elif request.method == 'DELETE':
        # Soft delete
        document.is_active = False
        document.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def prompt_templates_list(request):
    """List prompt templates or create new one"""
    if request.method == 'GET':
        templates = PromptTemplate.objects.filter(is_active=True)
        serializer = PromptTemplateSerializer(templates, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = PromptTemplateSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(created_by=request.user)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def prompt_template_detail(request, template_id):
    """Get, update or delete a specific prompt template"""
    try:
        template = PromptTemplate.objects.get(id=template_id)
    except PromptTemplate.DoesNotExist:
        return Response(
            {'error': '템플릿을 찾을 수 없습니다'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'GET':
        serializer = PromptTemplateSerializer(template)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = PromptTemplateSerializer(
            template,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    elif request.method == 'DELETE':
        # Soft delete
        template.is_active = False
        template.save()
        return Response(status=status.HTTP_204_NO_CONTENT)
