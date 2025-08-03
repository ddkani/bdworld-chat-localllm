import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Chat from './Chat';
import { AuthProvider } from '../contexts/AuthContext';
import * as AuthModule from '../contexts/AuthContext';
import { sessionService } from '../services/api';
import { ChatWebSocket } from '../services/websocket';

// Mock modules
jest.mock('../services/api');
jest.mock('../services/websocket');
jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'),
  useAuth: jest.fn(),
}));

const mockedSessionService = sessionService as jest.Mocked<typeof sessionService>;
const MockedChatWebSocket = ChatWebSocket as jest.MockedClass<typeof ChatWebSocket>;

// Mock auth hook return value
const mockUseAuth = {
  user: { id: 1, username: 'testuser', created_at: '2024-01-01', last_login: '2024-01-01' },
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  checkAuth: jest.fn(),
};

// Mock WebSocket instance
const mockWsInstance = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
  onOpen: jest.fn(),
  onMessage: jest.fn(),
  onError: jest.fn(),
  onClose: jest.fn(),
  isConnected: jest.fn(() => true),
};

// Helper to create test session
const createTestSession = (id: number, title: string, date: string = '2024-01-01') => ({
  id,
  title,
  created_at: date,
  updated_at: date,
  user: mockUseAuth.user,
  is_active: true,
  settings: {
    temperature: 0.7,
    max_tokens: 512,
    system_prompt: null,
    prompt_template: 'default',
  },
  message_count: 0,
});

const renderChat = () => {
  (AuthModule.useAuth as jest.Mock).mockReturnValue(mockUseAuth);
  return render(
    <BrowserRouter>
      <Chat />
    </BrowserRouter>
  );
};

describe('Chat Page Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    MockedChatWebSocket.mockImplementation(() => mockWsInstance as any);
  });

  describe('Initial Load', () => {
    it('should load sessions on mount', async () => {
      const mockSessions = [
        createTestSession(1, 'Session 1'),
        createTestSession(2, 'Session 2', '2024-01-02'),
      ];
      mockedSessionService.list.mockResolvedValue(mockSessions);

      renderChat();

      await waitFor(() => {
        expect(mockedSessionService.list).toHaveBeenCalled();
        expect(screen.getByText('Session 1')).toBeInTheDocument();
        expect(screen.getByText('Session 2')).toBeInTheDocument();
      });
    });

    it('should handle session load error', async () => {
      mockedSessionService.list.mockRejectedValue(new Error('Network error'));

      renderChat();

      await waitFor(() => {
        expect(mockedSessionService.list).toHaveBeenCalled();
      });

      // Should still render the interface
      expect(screen.getByText('대화 목록')).toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    it('should create new session', async () => {
      const user = userEvent;
      mockedSessionService.list.mockResolvedValue([]);
      mockedSessionService.create.mockResolvedValue(
        createTestSession(3, '새 대화')
      );

      renderChat();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '새 대화' })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: '새 대화' }));

      await waitFor(() => {
        expect(mockedSessionService.create).toHaveBeenCalled();
        expect(mockWsInstance.connect).toHaveBeenCalledWith(
          '3',
          expect.any(Object)
        );
      });
    });

    it('should select existing session', async () => {
      const user = userEvent;
      const mockSessions = [
        createTestSession(1, 'Session 1'),
      ];
      mockedSessionService.list.mockResolvedValue(mockSessions);
      mockedSessionService.getMessages.mockResolvedValue([
        { id: 1, role: 'user', content: 'Hello', created_at: '2024-01-01 10:00:00' },
        { id: 2, role: 'assistant', content: 'Hi there!', created_at: '2024-01-01 10:00:01' },
      ]);

      renderChat();

      await waitFor(() => {
        expect(screen.getByText('Session 1')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Session 1'));

      await waitFor(() => {
        expect(mockedSessionService.getMessages).toHaveBeenCalledWith(1);
        expect(mockWsInstance.connect).toHaveBeenCalledWith('1', expect.any(Object));
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
      });
    });

    it('should delete session', async () => {
      const user = userEvent;
      const mockSessions = [
        createTestSession(1, 'Session 1'),
      ];
      mockedSessionService.list.mockResolvedValue(mockSessions);
      mockedSessionService.delete.mockResolvedValue(undefined);

      renderChat();

      await waitFor(() => {
        expect(screen.getByText('Session 1')).toBeInTheDocument();
      });

      // Select the session first
      await user.click(screen.getByText('Session 1'));

      // Delete the session
      const deleteButton = screen.getByLabelText('삭제');
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockedSessionService.delete).toHaveBeenCalledWith(1);
        expect(mockWsInstance.disconnect).toHaveBeenCalled();
      });
    });

    it('should update session title', async () => {
      const user = userEvent;
      const mockSessions = [
        createTestSession(1, 'Old Title'),
      ];
      mockedSessionService.list.mockResolvedValue(mockSessions);
      mockedSessionService.update.mockResolvedValue(
        createTestSession(1, 'New Title')
      );

      renderChat();

      await waitFor(() => {
        expect(screen.getByText('Old Title')).toBeInTheDocument();
      });

      // Click edit button
      const editButton = screen.getByLabelText('편집');
      await user.click(editButton);

      // Update title
      const input = screen.getByDisplayValue('Old Title');
      await user.clear(input);
      await user.type(input, 'New Title');

      // Save
      const saveButton = screen.getByLabelText('저장');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockedSessionService.update).toHaveBeenCalledWith(1, { title: 'New Title' });
        // Title update is handled by API, not WebSocket
      });
    });
  });

  describe('Message Handling', () => {
    beforeEach(async () => {
      const mockSessions = [
        createTestSession(1, 'Test Session'),
      ];
      mockedSessionService.list.mockResolvedValue(mockSessions);
      mockedSessionService.getMessages.mockResolvedValue([]);

      renderChat();

      await waitFor(() => {
        expect(screen.getByText('Test Session')).toBeInTheDocument();
      });

      // Select session
      const user = userEvent;
      await user.click(screen.getByText('Test Session'));

      await waitFor(() => {
        expect(mockWsInstance.connect).toHaveBeenCalled();
      });
    });

    it('should send message', async () => {
      const user = userEvent;

      const input = screen.getByPlaceholderText('메시지를 입력하세요...');
      await user.type(input, 'Hello AI!');
      await user.keyboard('{Enter}');

      expect(mockWsInstance.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'message',
        content: 'Hello AI!',
        use_rag: false
      }));
      expect(input).toHaveValue('');
    });

    it('should send message with RAG', async () => {
      const user = userEvent;

      // Enable RAG
      await user.click(screen.getByLabelText('설정'));
      const ragCheckbox = screen.getByRole('checkbox', { name: 'RAG 사용' });
      await user.click(ragCheckbox);
      await user.click(screen.getByText('저장'));

      // Send message
      const input = screen.getByPlaceholderText('메시지를 입력하세요...');
      await user.type(input, 'Hello with RAG!');
      await user.keyboard('{Enter}');

      expect(mockWsInstance.send).toHaveBeenCalledWith(expect.objectContaining({
        type: 'message',
        content: 'Hello with RAG!',
        use_rag: true
      }));
    });

    it('should handle incoming messages', async () => {
      // Simulate WebSocket connection callback
      const connectCall = mockWsInstance.connect.mock.calls[0];
      const wsCallbacks = connectCall[1];

      // Simulate incoming message
      act(() => {
        wsCallbacks.onMessage({
          type: 'message',
          message: {
            id: 3,
            role: 'assistant',
            content: 'Hello from AI!',
            created_at: '2024-01-01T12:00:00Z',
          },
        });
      });

      await waitFor(() => {
        expect(screen.getByText('Hello from AI!')).toBeInTheDocument();
      });
    });

    it('should handle streaming tokens', async () => {
      // Simulate WebSocket connection callback
      const connectCall = mockWsInstance.connect.mock.calls[0];
      const wsCallbacks = connectCall[1];

      // Simulate streaming tokens
      act(() => {
        wsCallbacks.onMessage({ type: 'start', message_id: 1 });
      });

      act(() => {
        wsCallbacks.onMessage({ type: 'token', token: 'Hello' });
      });

      act(() => {
        wsCallbacks.onMessage({ type: 'token', token: ' world' });
      });

      act(() => {
        wsCallbacks.onMessage({ type: 'end' });
      });

      await waitFor(() => {
        expect(screen.getByText('Hello world')).toBeInTheDocument();
      });
    });
  });

  describe('Settings Management', () => {
    beforeEach(async () => {
      mockedSessionService.list.mockResolvedValue([]);
      renderChat();
    });

    it('should update chat settings', async () => {
      const user = userEvent;

      // Open settings
      await user.click(screen.getByLabelText('설정'));

      // Update temperature
      const temperatureSlider = screen.getByLabelText('Temperature: 0.7');
      fireEvent.change(temperatureSlider, { target: { value: '0.9' } });

      // Save settings
      await user.click(screen.getByText('저장'));

      // Settings update should be verified through WebSocket send method
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket connection error', async () => {
      mockedSessionService.list.mockResolvedValue([
        createTestSession(1, 'Session 1'),
      ]);

      renderChat();

      await waitFor(() => {
        expect(screen.getByText('Session 1')).toBeInTheDocument();
      });

      // Select session
      const user = userEvent;
      await user.click(screen.getByText('Session 1'));

      // Simulate connection error
      const connectCall = mockWsInstance.connect.mock.calls[0];
      const wsCallbacks = connectCall[1];

      act(() => {
        wsCallbacks.onError(new Error('Connection failed'));
      });

      // Should show disconnected status
      expect(screen.getByText('연결 끊김')).toBeInTheDocument();
    });

    it('should handle message send error', async () => {
      mockWsInstance.isConnected.mockReturnValue(false);
      mockedSessionService.list.mockResolvedValue([]);

      renderChat();

      const user = userEvent;

      // Try to send message while disconnected
      const input = screen.getByPlaceholderText('메시지를 입력하세요...');
      await user.type(input, 'Test message');

      // Input should be disabled when not connected
      expect(input).toBeDisabled();
    });
  });

  describe('User Logout', () => {
    it('should handle user logout', async () => {
      const user = userEvent;
      mockedSessionService.list.mockResolvedValue([]);

      renderChat();

      // Open user menu
      await user.click(screen.getByLabelText('account of current user'));
      
      // Click logout menu item
      await user.click(screen.getByText('로그아웃'));

      expect(mockUseAuth.logout).toHaveBeenCalled();
      expect(mockWsInstance.disconnect).toHaveBeenCalled();
    });
  });
});