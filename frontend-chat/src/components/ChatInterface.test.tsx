import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatInterface from './ChatInterface';
import { ChatWebSocket } from '../services/websocket';
import { sessionService } from '../services/api';

// Mock dependencies
jest.mock('../services/websocket');
jest.mock('../services/api');

const MockedChatWebSocket = ChatWebSocket as jest.MockedClass<typeof ChatWebSocket>;
const mockedSessionService = sessionService as jest.Mocked<typeof sessionService>;

describe('ChatInterface Component', () => {
  let mockWsInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock WebSocket instance
    mockWsInstance = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      send: jest.fn(),
      onOpen: jest.fn(),
      onMessage: jest.fn(),
      onError: jest.fn(),
      onClose: jest.fn(),
      clearHandlers: jest.fn(),
      isConnected: jest.fn(() => true),
    };
    
    MockedChatWebSocket.mockImplementation(() => mockWsInstance);
  });

  it('should render chat interface components', () => {
    render(<ChatInterface sessionId="test-session" />);

    expect(screen.getByPlaceholderText('메시지를 입력하세요...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
  });

  it('should connect to WebSocket on mount', () => {
    render(<ChatInterface sessionId="test-session" />);

    expect(MockedChatWebSocket).toHaveBeenCalledWith('test-session');
    expect(mockWsInstance.connect).toHaveBeenCalled();
  });

  it('should handle message submission', async () => {
    const user = userEvent;
    render(<ChatInterface sessionId="test-session" />);

    const input = screen.getByPlaceholderText('메시지를 입력하세요...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    await user.type(input, 'Hello world');
    await user.click(sendButton);

    expect(mockWsInstance.send).toHaveBeenCalledWith({
      type: 'message',
      content: 'Hello world',
      use_rag: false,
    });
    expect(input).toHaveValue('');
  });

  it('should handle Enter key submission', async () => {
    const user = userEvent;
    render(<ChatInterface sessionId="test-session" />);

    const input = screen.getByPlaceholderText('메시지를 입력하세요...');

    await user.type(input, 'Test message{Enter}');

    expect(mockWsInstance.send).toHaveBeenCalledWith({
      type: 'message',
      content: 'Test message',
      use_rag: false,
    });
  });

  it('should not send empty messages', async () => {
    const user = userEvent;
    render(<ChatInterface sessionId="test-session" />);

    const sendButton = screen.getByRole('button', { name: /send/i });
    await user.click(sendButton);

    expect(mockWsInstance.send).not.toHaveBeenCalled();
  });

  it('should toggle RAG mode', async () => {
    const user = userEvent;
    render(<ChatInterface sessionId="test-session" />);

    // Find and click the RAG toggle
    const ragSwitch = screen.getByLabelText('RAG 사용');
    await user.click(ragSwitch);

    // Send a message with RAG enabled
    const input = screen.getByPlaceholderText('메시지를 입력하세요...');
    await user.type(input, 'Test with RAG{Enter}');

    expect(mockWsInstance.send).toHaveBeenCalledWith({
      type: 'message',
      content: 'Test with RAG',
      use_rag: true,
    });
  });

  it('should display connection status', () => {
    render(<ChatInterface sessionId="test-session" />);
    
    expect(screen.getByText('연결됨')).toBeInTheDocument();
  });

  it('should display disconnected status', () => {
    mockWsInstance.isConnected.mockReturnValue(false);
    render(<ChatInterface sessionId="test-session" />);
    
    expect(screen.getByText('연결 끊김')).toBeInTheDocument();
  });

  it('should handle incoming messages', async () => {
    render(<ChatInterface sessionId="test-session" />);

    // Get the onMessage callback
    const onMessageCallback = mockWsInstance.onMessage.mock.calls[0][0];

    // Simulate receiving message history
    act(() => {
      onMessageCallback({
        type: 'history',
        messages: [
          { id: 1, role: 'user', content: 'Hello', created_at: '2024-01-01T10:00:00Z' },
          { id: 2, role: 'assistant', content: 'Hi there!', created_at: '2024-01-01T10:00:01Z' },
        ],
      });
    });

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
    });
  });

  it('should handle streaming messages', async () => {
    render(<ChatInterface sessionId="test-session" />);

    const onMessageCallback = mockWsInstance.onMessage.mock.calls[0][0];

    // Start streaming
    act(() => {
      onMessageCallback({ type: 'start', message_id: 1 });
    });

    // Stream tokens
    act(() => {
      onMessageCallback({ type: 'token', token: 'Hello' });
    });

    act(() => {
      onMessageCallback({ type: 'token', token: ' world' });
    });

    // End streaming
    act(() => {
      onMessageCallback({ type: 'end' });
    });

    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });
  });

  it('should disconnect on unmount', () => {
    const { unmount } = render(<ChatInterface sessionId="test-session" />);

    unmount();

    expect(mockWsInstance.clearHandlers).toHaveBeenCalled();
    expect(mockWsInstance.disconnect).toHaveBeenCalled();
  });

  it('should disable input while streaming', async () => {
    render(<ChatInterface sessionId="test-session" />);

    const onMessageCallback = mockWsInstance.onMessage.mock.calls[0][0];
    const input = screen.getByPlaceholderText('메시지를 입력하세요...');

    // Start streaming
    act(() => {
      onMessageCallback({ type: 'start', message_id: 1 });
    });

    expect(input).toBeDisabled();

    // End streaming
    act(() => {
      onMessageCallback({ type: 'end' });
    });

    expect(input).not.toBeDisabled();
  });
});