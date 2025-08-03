import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PromptTemplates from './PromptTemplates';
import { promptService } from '../services/api';

// Mock the api service
jest.mock('../services/api');

describe('PromptTemplates Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTemplates = [
    {
      id: 1,
      name: 'Template 1',
      system_prompt: 'System prompt 1',
      examples: [{ input: 'test input', output: 'test output' }],
      is_active: true,
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 2,
      name: 'Template 2',
      system_prompt: 'System prompt 2',
      examples: [],
      is_active: false,
      created_at: '2024-01-02',
      updated_at: '2024-01-02',
    },
  ];

  it('should render component title', () => {
    render(<PromptTemplates />);
    expect(screen.getByText('프롬프트 템플릿')).toBeInTheDocument();
  });

  it('should load templates on mount', async () => {
    promptService.list.mockResolvedValue(mockTemplates);
    render(<PromptTemplates />);

    await waitFor(() => {
      expect(promptService.list).toHaveBeenCalled();
    });
  });

  it('should display templates in table', async () => {
    promptService.list.mockResolvedValue(mockTemplates);
    render(<PromptTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument();
      expect(screen.getByText('Template 2')).toBeInTheDocument();
    });
  });

  it('should show active status for active templates', async () => {
    promptService.list.mockResolvedValue(mockTemplates);
    render(<PromptTemplates />);

    await waitFor(() => {
      const activeChips = screen.getAllByText('활성');
      expect(activeChips).toHaveLength(1);
    });
  });

  it('should open add dialog when clicking add button', async () => {
    const user = userEvent;
    promptService.list.mockResolvedValue([]);
    render(<PromptTemplates />);

    const addButton = await screen.findByRole('button', { name: /새 템플릿/ });
    await user.click(addButton);

    expect(screen.getByText('프롬프트 템플릿 추가')).toBeInTheDocument();
    expect(screen.getByLabelText('템플릿 이름')).toBeInTheDocument();
    expect(screen.getByLabelText('시스템 프롬프트')).toBeInTheDocument();
  });

  it('should create new template', async () => {
    const user = userEvent;
    promptService.list.mockResolvedValue([]);
    promptService.create.mockResolvedValue({
      id: 3,
      name: 'New Template',
      system_prompt: 'New system prompt',
      examples: [],
      is_active: true,
      created_at: '2024-01-03',
      updated_at: '2024-01-03',
    });

    render(<PromptTemplates />);

    // Open dialog
    const addButton = await screen.findByRole('button', { name: /새 템플릿/ });
    await user.click(addButton);

    // Fill form
    const nameInput = screen.getByLabelText('템플릿 이름');
    await user.type(nameInput, 'New Template');

    const promptInput = screen.getByLabelText('시스템 프롬프트');
    await user.type(promptInput, 'New system prompt');

    // Submit
    const saveButton = screen.getByText('저장');
    await user.click(saveButton);

    await waitFor(() => {
      expect(promptService.create).toHaveBeenCalledWith({
        name: 'New Template',
        system_prompt: 'New system prompt',
        examples: [],
        is_active: true,
      });
    });
  });

  it('should open edit dialog when clicking edit button', async () => {
    const user = userEvent;
    promptService.list.mockResolvedValue(mockTemplates);
    render(<PromptTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText('수정');
    await user.click(editButtons[0]);

    expect(screen.getByText('프롬프트 템플릿 수정')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Template 1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('System prompt 1')).toBeInTheDocument();
  });

  it('should update template', async () => {
    const user = userEvent;
    promptService.list.mockResolvedValue(mockTemplates);
    promptService.update.mockResolvedValue({
      ...mockTemplates[0],
      name: 'Updated Template',
    });

    render(<PromptTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument();
    });

    // Open edit dialog
    const editButtons = screen.getAllByLabelText('수정');
    await user.click(editButtons[0]);

    // Update name
    const nameInput = screen.getByLabelText('템플릿 이름');
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Template');

    // Save
    const saveButton = screen.getByText('저장');
    await user.click(saveButton);

    await waitFor(() => {
      expect(promptService.update).toHaveBeenCalledWith(1, expect.objectContaining({
        name: 'Updated Template',
      }));
    });
  });

  it('should delete template with confirmation', async () => {
    const user = userEvent;
    window.confirm = jest.fn(() => true);
    promptService.list.mockResolvedValue(mockTemplates);
    promptService.delete.mockResolvedValue(undefined);

    render(<PromptTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText('삭제');
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('정말로 이 템플릿을 삭제하시겠습니까?');
    await waitFor(() => {
      expect(promptService.delete).toHaveBeenCalledWith(1);
    });
  });

  it('should activate template', async () => {
    const user = userEvent;
    promptService.list.mockResolvedValue(mockTemplates);
    promptService.activate.mockResolvedValue(undefined);

    render(<PromptTemplates />);

    await waitFor(() => {
      expect(screen.getByText('Template 2')).toBeInTheDocument();
    });

    const activateButtons = screen.getAllByLabelText('활성화');
    await user.click(activateButtons[0]); // Template 2 is inactive

    await waitFor(() => {
      expect(promptService.activate).toHaveBeenCalledWith(2);
    });
  });

  it('should toggle active status in form', async () => {
    const user = userEvent;
    promptService.list.mockResolvedValue([]);
    render(<PromptTemplates />);

    // Open add dialog
    const addButton = await screen.findByRole('button', { name: /새 템플릿/ });
    await user.click(addButton);

    // Toggle active switch
    const activeSwitch = screen.getByRole('checkbox', { name: /활성 상태/ });
    expect(activeSwitch).toBeChecked();

    await user.click(activeSwitch);
    expect(activeSwitch).not.toBeChecked();
  });

  it('should show loading state', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    promptService.list.mockReturnValue(promise);

    render(<PromptTemplates />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    resolvePromise!([]);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should show error message on API failure', async () => {
    promptService.list.mockRejectedValue(new Error('API Error'));
    
    render(<PromptTemplates />);

    await waitFor(() => {
      expect(screen.getByText('템플릿을 불러오는데 실패했습니다.')).toBeInTheDocument();
    });
  });

  it('should add example to template', async () => {
    const user = userEvent;
    promptService.list.mockResolvedValue([]);
    render(<PromptTemplates />);

    // Open dialog
    const addButton = await screen.findByRole('button', { name: /새 템플릿/ });
    await user.click(addButton);

    // Add example
    const addExampleButton = screen.getByText('예제 추가');
    await user.click(addExampleButton);

    expect(screen.getByLabelText('입력 예제')).toBeInTheDocument();
    expect(screen.getByLabelText('출력 예제')).toBeInTheDocument();
  });

  it('should remove example from template', async () => {
    const user = userEvent;
    promptService.list.mockResolvedValue([]);
    render(<PromptTemplates />);

    // Open dialog
    const addButton = await screen.findByRole('button', { name: /새 템플릿/ });
    await user.click(addButton);

    // Add example
    await user.click(screen.getByText('예제 추가'));

    // Remove example
    const removeButton = screen.getByLabelText('예제 삭제');
    await user.click(removeButton);

    expect(screen.queryByLabelText('입력 예제')).not.toBeInTheDocument();
  });
});