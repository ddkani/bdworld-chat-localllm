import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  FormControlLabel,
  Switch,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { ChatWebSocket } from '../services/websocket';
import { Message, WebSocketMessage } from '../types';

interface ChatInterfaceProps {
  sessionId: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [useRAG, setUseRAG] = useState(false);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<ChatWebSocket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'session_info':
        console.log('Session info received:', message.session);
        break;
      
      case 'history':
        setMessages(message.messages);
        break;
      
      case 'message':
        setMessages(prev => [...prev, message.message]);
        break;
      
      case 'stream_start':
        setIsStreaming(true);
        setStreamingContent('');
        break;
      
      case 'stream_token':
        console.log('Received token:', message.token);
        flushSync(() => {
          setStreamingContent(prev => prev + message.token);
        });
        break;
      
      case 'stream_end':
        setMessages(prev => [...prev, message.message]);
        setIsStreaming(false);
        setStreamingContent('');
        break;
      
      case 'stream_error':
        console.error('Stream error:', message.error);
        setIsStreaming(false);
        setStreamingContent('');
        break;
      
      case 'error':
        console.error('WebSocket error:', message.error);
        break;
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    console.log('ChatInterface: Connecting to session:', sessionId);

    // Reset state when session changes
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);

    // Cleanup previous WebSocket if exists
    if (wsRef.current) {
      wsRef.current.disconnect();
      wsRef.current = null;
    }

    const ws = new ChatWebSocket(sessionId);
    wsRef.current = ws;

    ws.onMessage(handleWebSocketMessage);
    ws.onOpen(() => {
      console.log('ChatInterface: WebSocket connected for session:', sessionId);
      setConnected(true);
    });
    ws.onClose(() => {
      console.log('ChatInterface: WebSocket disconnected for session:', sessionId);
      setConnected(false);
    });
    ws.onError((error) => {
      if (!wsRef.current || wsRef.current !== ws) return;
      console.error('WebSocket error:', error);
    });

    // Delay connection to avoid React StrictMode double-connect issues
    const connectTimer = setTimeout(() => {
      ws.connect();
    }, 100);

    return () => {
      console.log('ChatInterface: Cleaning up WebSocket for session:', sessionId);
      clearTimeout(connectTimer);
      if (wsRef.current) {
        wsRef.current.clearHandlers();
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [sessionId, handleWebSocketMessage]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || !wsRef.current || isStreaming) return;

    wsRef.current.send({
      type: 'message',
      content: inputMessage.trim(),
      use_rag: useRAG,
    });

    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';
    
    return (
      <Box
        key={message.id || `${message.role}-${message.created_at}`}
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          mb: 2,
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '70%',
            backgroundColor: isUser ? 'primary.light' : 'grey.100',
            color: isUser ? 'primary.contrastText' : 'text.primary',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}
        >
          <Typography variant="body1" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
            {message.content}
          </Typography>
          {message.rag_context && (
            <Box mt={1}>
              <Chip size="small" label="RAG 활용" />
            </Box>
          )}
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Connection Status */}
      <Box sx={{ p: 1, textAlign: 'center' }}>
        <Chip
          size="small"
          label={connected ? '연결됨' : '연결 끊김'}
          color={connected ? 'success' : 'error'}
        />
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          backgroundColor: 'background.default',
        }}
      >
        {messages.map(renderMessage)}
        
        {/* Streaming Message */}
        {isStreaming && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              mb: 2,
            }}
          >
            <Paper
              elevation={1}
              sx={{
                p: 2,
                maxWidth: '70%',
                backgroundColor: 'grey.100',
                overflowWrap: 'break-word',
                wordBreak: 'break-word',
              }}
            >
              <Typography variant="body1" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>
                {streamingContent}
              </Typography>
              <CircularProgress size={16} sx={{ ml: 1 }} />
            </Paper>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ mb: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={useRAG}
                onChange={(e) => setUseRAG(e.target.checked)}
                size="small"
              />
            }
            label="RAG 사용"
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            disabled={!connected || isStreaming}
          />
          <IconButton
            color="primary"
            onClick={handleSendMessage}
            disabled={!connected || !inputMessage.trim() || isStreaming}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChatInterface;