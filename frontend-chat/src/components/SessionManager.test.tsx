import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionManager from './SessionManager';
import { sessionService } from '../services/api';
import { ChatSession } from '../types';

// Mock the api module
jest.mock('../services/api');
const mockedSessionService = sessionService as jest.Mocked<typeof sessionService>;

describe('SessionManager Component', () => {
  const mockOnSessionSelect = jest.fn();
  
  // Helper to create test session
  const createTestSession = (id: number, title: string, date: string = '2024-01-01'): ChatSession => ({
    id,
    title,
    created_at: date + 'T10:00:00Z',
    updated_at: date + 'T10:00:00Z',
    user: { id: 1, username: 'testuser', created_at: '2024-01-01', last_login: '2024-01-01' },
    is_active: true,
    settings: {
      temperature: 0.7,
      max_tokens: 512,
      system_prompt: null,
      prompt_template: 'default',
    },
    message_count: 0,
  });

  const mockSessions: ChatSession[] = [
    createTestSession(1, '첫 번째 대화'),
    createTestSession(2, '두 번째 대화', '2024-01-02'),
  ];

  const defaultProps = {
    currentSessionId: null,
    onSessionSelect: mockOnSessionSelect,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render session manager', async () => {
    mockedSessionService.list.mockResolvedValue([]);
    render(<SessionManager {...defaultProps} />);

    expect(screen.getByText('채팅 세션')).toBeInTheDocument();
    expect(screen.getByText('새 채팅')).toBeInTheDocument();
  });

  it('should load and display sessions', async () => {
    mockedSessionService.list.mockResolvedValue(mockSessions);
    render(<SessionManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('첫 번째 대화')).toBeInTheDocument();
      expect(screen.getByText('두 번째 대화')).toBeInTheDocument();
    });
  });

  it('should handle session selection', async () => {
    const user = userEvent;
    mockedSessionService.list.mockResolvedValue(mockSessions);
    render(<SessionManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('첫 번째 대화')).toBeInTheDocument();
    });

    await user.click(screen.getByText('첫 번째 대화'));
    expect(mockOnSessionSelect).toHaveBeenCalledWith('1');
  });

  it('should highlight current session', async () => {
    mockedSessionService.list.mockResolvedValue(mockSessions);
    render(<SessionManager {...defaultProps} currentSessionId="1" />);

    await waitFor(() => {
      const sessionItem = screen.getByText('첫 번째 대화').closest('[role="button"]');
      expect(sessionItem).toHaveClass('Mui-selected');
    });
  });

  it('should create new session', async () => {
    const user = userEvent;
    mockedSessionService.list.mockResolvedValue([]);
    mockedSessionService.create.mockResolvedValue(createTestSession(3, '새 대화'));
    
    render(<SessionManager {...defaultProps} />);

    await user.click(screen.getByText('새 채팅'));

    await waitFor(() => {
      expect(mockedSessionService.create).toHaveBeenCalled();
      expect(mockOnSessionSelect).toHaveBeenCalledWith('3');
    });
  });

  it('should delete session', async () => {
    const user = userEvent;
    mockedSessionService.list.mockResolvedValue(mockSessions);
    mockedSessionService.delete.mockResolvedValue(undefined);
    
    render(<SessionManager {...defaultProps} currentSessionId="1" />);

    await waitFor(() => {
      expect(screen.getByText('첫 번째 대화')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getAllByLabelText('삭제')[0];
    await user.click(deleteButton);

    // Confirm deletion
    await user.click(screen.getByText('삭제'));

    await waitFor(() => {
      expect(mockedSessionService.delete).toHaveBeenCalledWith(1);
      expect(mockOnSessionSelect).toHaveBeenCalledWith(null);
    });
  });

  it('should cancel deletion', async () => {
    const user = userEvent;
    mockedSessionService.list.mockResolvedValue(mockSessions);
    
    render(<SessionManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('첫 번째 대화')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getAllByLabelText('삭제')[0];
    await user.click(deleteButton);

    // Cancel deletion
    await user.click(screen.getByText('취소'));

    expect(mockedSessionService.delete).not.toHaveBeenCalled();
  });

  it('should edit session title', async () => {
    const user = userEvent;
    mockedSessionService.list.mockResolvedValue(mockSessions);
    mockedSessionService.update.mockResolvedValue(createTestSession(1, '수정된 제목'));
    
    render(<SessionManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('첫 번째 대화')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getAllByLabelText('편집')[0];
    await user.click(editButton);

    // Edit title
    const input = screen.getByDisplayValue('첫 번째 대화');
    await user.clear(input);
    await user.type(input, '수정된 제목');

    // Save
    const saveButton = screen.getByLabelText('저장');
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockedSessionService.update).toHaveBeenCalledWith(1, { title: '수정된 제목' });
    });
  });

  it('should cancel editing', async () => {
    const user = userEvent;
    mockedSessionService.list.mockResolvedValue(mockSessions);
    
    render(<SessionManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('첫 번째 대화')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getAllByLabelText('편집')[0];
    await user.click(editButton);

    // Edit title
    const input = screen.getByDisplayValue('첫 번째 대화');
    await user.clear(input);
    await user.type(input, '수정된 제목');

    // Cancel
    const cancelButton = screen.getByLabelText('취소');
    await user.click(cancelButton);

    expect(mockedSessionService.update).not.toHaveBeenCalled();
    expect(screen.getByText('첫 번째 대화')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockedSessionService.list.mockReturnValue(new Promise(() => {})); // Never resolves
    render(<SessionManager {...defaultProps} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    mockedSessionService.list.mockRejectedValue(new Error('Failed to load'));
    render(<SessionManager {...defaultProps} />);

    await waitFor(() => {
      // Component should still render, just with empty list
      expect(screen.getByText('채팅 세션')).toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });
});