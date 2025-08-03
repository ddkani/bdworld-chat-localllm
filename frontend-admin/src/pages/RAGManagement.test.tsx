import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RAGManagement from './RAGManagement';
import { ragService } from '../services/api';

// Mock the api service
jest.mock('../services/api');

describe('RAGManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockDocuments = [
    { id: 1, content: 'Document 1', metadata: { type: 'text' }, created_at: '2024-01-01' },
    { id: 2, content: 'Document 2', metadata: { type: 'pdf' }, created_at: '2024-01-02' },
  ];

  it('should render component title', () => {
    render(<RAGManagement />);
    expect(screen.getByText('RAG 문서 관리')).toBeInTheDocument();
  });

  it('should render tabs', () => {
    render(<RAGManagement />);
    expect(screen.getByText('문서 목록')).toBeInTheDocument();
    expect(screen.getByText('유사도 검색')).toBeInTheDocument();
  });

  it('should load documents on mount', async () => {
    ragService.listDocuments.mockResolvedValue(mockDocuments);
    render(<RAGManagement />);

    await waitFor(() => {
      expect(ragService.listDocuments).toHaveBeenCalled();
    });
  });

  it('should display documents in table', async () => {
    ragService.listDocuments.mockResolvedValue(mockDocuments);
    render(<RAGManagement />);

    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
      expect(screen.getByText('Document 2')).toBeInTheDocument();
    });
  });

  it('should open add document dialog when clicking add button', async () => {
    const user = userEvent;
    ragService.listDocuments.mockResolvedValue([]);
    render(<RAGManagement />);

    const addButton = await screen.findByLabelText('문서 추가');
    await user.click(addButton);

    expect(screen.getByText('새 문서 추가')).toBeInTheDocument();
    expect(screen.getByLabelText('문서 내용')).toBeInTheDocument();
  });

  it('should add new document', async () => {
    const user = userEvent;
    ragService.listDocuments.mockResolvedValue([]);
    ragService.addDocument.mockResolvedValue({
      id: 3,
      content: 'New document content',
      metadata: {},
      created_at: '2024-01-03'
    });

    render(<RAGManagement />);

    // Open dialog
    const addButton = await screen.findByLabelText('문서 추가');
    await user.click(addButton);

    // Fill form
    const contentInput = screen.getByLabelText('문서 내용');
    await user.type(contentInput, 'New document content');

    // Submit
    const submitButton = screen.getByText('추가');
    await user.click(submitButton);

    await waitFor(() => {
      expect(ragService.addDocument).toHaveBeenCalledWith(
        'New document content',
        expect.any(Object)
      );
    });
  });

  it('should delete document with confirmation', async () => {
    const user = userEvent;
    window.confirm = jest.fn(() => true);
    ragService.listDocuments.mockResolvedValue(mockDocuments);
    ragService.deleteDocument.mockResolvedValue(undefined);

    render(<RAGManagement />);

    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });

    // Click delete button for first document
    const deleteButtons = screen.getAllByLabelText('삭제');
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('정말로 이 문서를 삭제하시겠습니까?');
    await waitFor(() => {
      expect(ragService.deleteDocument).toHaveBeenCalledWith(1);
    });
  });

  it('should cancel document deletion when not confirmed', async () => {
    const user = userEvent;
    window.confirm = jest.fn(() => false);
    ragService.listDocuments.mockResolvedValue(mockDocuments);

    render(<RAGManagement />);

    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('삭제');
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(ragService.deleteDocument).not.toHaveBeenCalled();
  });

  it('should switch to search tab', async () => {
    const user = userEvent;
    render(<RAGManagement />);

    const searchTab = screen.getByText('유사도 검색');
    await user.click(searchTab);

    expect(screen.getByLabelText('검색어')).toBeInTheDocument();
    expect(screen.getByLabelText('결과 개수')).toBeInTheDocument();
  });

  it('should perform similarity search', async () => {
    const user = userEvent;
    const searchResults = [
      { ...mockDocuments[0], similarity: 0.95 },
      { ...mockDocuments[1], similarity: 0.87 },
    ];
    ragService.searchSimilar.mockResolvedValue(searchResults);

    render(<RAGManagement />);

    // Switch to search tab
    await user.click(screen.getByText('유사도 검색'));

    // Enter search query
    const searchInput = screen.getByLabelText('검색어');
    await user.type(searchInput, 'test query');

    // Click search button
    const searchButton = screen.getByRole('button', { name: /검색/ });
    await user.click(searchButton);

    await waitFor(() => {
      expect(ragService.searchSimilar).toHaveBeenCalledWith('test query', 5);
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('87%')).toBeInTheDocument();
    });
  });

  it('should change search result count', async () => {
    const user = userEvent;
    render(<RAGManagement />);

    // Switch to search tab
    await user.click(screen.getByText('유사도 검색'));

    // Change result count
    const topKInput = screen.getByLabelText('결과 수');
    await user.clear(topKInput);
    await user.type(topKInput, '10');

    // Search
    const searchInput = screen.getByLabelText('검색어');
    await user.type(searchInput, 'test');
    await user.click(screen.getByRole('button', { name: /검색/ }));

    await waitFor(() => {
      expect(ragService.searchSimilar).toHaveBeenCalledWith('test', 10);
    });
  });

  it('should show error message on API failure', async () => {
    ragService.listDocuments.mockRejectedValue(new Error('API Error'));
    
    render(<RAGManagement />);

    await waitFor(() => {
      expect(screen.getByText('문서 목록을 불러오는데 실패했습니다.')).toBeInTheDocument();
    });
  });

  it('should show loading state during search', async () => {
    const user = userEvent;
    ragService.listDocuments.mockResolvedValue([]);
    // Create a promise that we can control
    let resolveSearch: (value: any) => void;
    const searchPromise = new Promise((resolve) => {
      resolveSearch = resolve;
    });
    ragService.searchSimilar.mockReturnValue(searchPromise);

    render(<RAGManagement />);

    // Switch to search tab
    await user.click(screen.getByText('유사도 검색'));

    // Start search
    const searchInput = screen.getByLabelText('검색 쿼리');
    await user.type(searchInput, 'test');
    await user.click(screen.getByRole('button', { name: /검색/ }));

    // Check loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Resolve search
    resolveSearch!([]);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should validate search query', async () => {
    const user = userEvent;
    ragService.listDocuments.mockResolvedValue([]);
    ragService.searchSimilar.mockResolvedValue([]);
    render(<RAGManagement />);

    // Switch to search tab
    await user.click(screen.getByText('유사도 검색'));

    // Search button should be enabled (not disabled when empty)
    const searchButton = screen.getByRole('button', { name: /검색/ });
    expect(searchButton).toBeEnabled();

    // Try to search with empty query - should not call API
    await user.click(searchButton);
    expect(ragService.searchSimilar).not.toHaveBeenCalled();

    // Type in search query
    const searchInput = screen.getByLabelText('검색 쿼리');
    await user.type(searchInput, 'test');

    // Now search should work
    await user.click(searchButton);
    expect(ragService.searchSimilar).toHaveBeenCalledWith('test', 5);
  });
});