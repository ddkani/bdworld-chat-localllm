import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FineTuning from './FineTuning';
import { finetuningService } from '../services/api';

// Mock the api service
jest.mock('../services/api');

describe('FineTuning Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockJobs = [
    {
      id: 1,
      name: 'Job 1',
      status: 'running',
      base_model: 'mistral-7b-instruct-v0.2',
      dataset_path: '/datasets/train1.jsonl',
      config: {
        epochs: 3,
        batch_size: 4,
        learning_rate: 0.0001,
        gradient_accumulation_steps: 4,
      },
      created_at: '2024-01-01',
      updated_at: '2024-01-01',
    },
    {
      id: 2,
      name: 'Job 2',
      status: 'completed',
      base_model: 'mistral-7b-instruct-v0.2',
      dataset_path: '/datasets/train2.jsonl',
      config: {
        epochs: 5,
        batch_size: 8,
        learning_rate: 0.0002,
        gradient_accumulation_steps: 2,
      },
      created_at: '2024-01-02',
      updated_at: '2024-01-02',
    },
  ];

  it('should render component title', () => {
    render(<FineTuning />);
    expect(screen.getByText('Fine-tuning')).toBeInTheDocument();
  });

  it('should load jobs on mount', async () => {
    finetuningService.listJobs.mockResolvedValue(mockJobs);
    render(<FineTuning />);

    await waitFor(() => {
      expect(finetuningService.listJobs).toHaveBeenCalled();
    });
  });

  it('should display jobs in table', async () => {
    finetuningService.listJobs.mockResolvedValue(mockJobs);
    render(<FineTuning />);

    await waitFor(() => {
      expect(screen.getByText('Job 1')).toBeInTheDocument();
      expect(screen.getByText('Job 2')).toBeInTheDocument();
    });
  });

  it('should show correct status labels', async () => {
    finetuningService.listJobs.mockResolvedValue(mockJobs);
    render(<FineTuning />);

    await waitFor(() => {
      expect(screen.getByText('진행중')).toBeInTheDocument();
      expect(screen.getByText('완료')).toBeInTheDocument();
    });
  });

  it('should refresh jobs periodically', async () => {
    finetuningService.listJobs.mockResolvedValue(mockJobs);
    render(<FineTuning />);

    await waitFor(() => {
      expect(finetuningService.listJobs).toHaveBeenCalledTimes(1);
    });

    // Fast-forward 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(finetuningService.listJobs).toHaveBeenCalledTimes(2);
    });
  });

  it('should open create dialog when clicking new job button', async () => {
    const user = userEvent;
    finetuningService.listJobs.mockResolvedValue([]);
    render(<FineTuning />);

    const newJobButton = await screen.findByRole('button', { name: /새 학습 작업/ });
    await user.click(newJobButton);

    expect(screen.getByText('새 Fine-tuning 작업')).toBeInTheDocument();
    expect(screen.getByLabelText('작업명')).toBeInTheDocument();
  });

  it('should upload dataset file', async () => {
    const user = userEvent;
    finetuningService.listJobs.mockResolvedValue([]);
    finetuningService.uploadDataset.mockResolvedValue({ path: '/datasets/uploaded.jsonl' });
    
    render(<FineTuning />);

    // Open dialog
    const newJobButton = await screen.findByRole('button', { name: /새 학습 작업/ });
    await user.click(newJobButton);

    // Mock file
    const file = new File(['{"text": "sample"}'], 'dataset.jsonl', { type: 'application/jsonl' });
    const uploadInput = screen.getByLabelText(/데이터셋 업로드/) as HTMLInputElement;
    
    await user.upload(uploadInput, file);

    await waitFor(() => {
      expect(finetuningService.uploadDataset).toHaveBeenCalledWith(file);
      expect(screen.getByText(/업로드 완료: uploaded.jsonl/)).toBeInTheDocument();
    });
  });

  it('should create new training job', async () => {
    const user = userEvent;
    finetuningService.listJobs.mockResolvedValue([]);
    finetuningService.uploadDataset.mockResolvedValue({ path: '/datasets/uploaded.jsonl' });
    finetuningService.createJob.mockResolvedValue({
      id: 3,
      name: 'New Job',
      status: 'pending',
      base_model: 'mistral-7b-instruct-v0.2',
      dataset_path: '/datasets/uploaded.jsonl',
      config: {
        epochs: 3,
        batch_size: 4,
        learning_rate: 0.0001,
        gradient_accumulation_steps: 4,
      },
      created_at: '2024-01-03',
      updated_at: '2024-01-03',
    });

    render(<FineTuning />);

    // Open dialog
    const newJobButton = await screen.findByRole('button', { name: /새 학습 작업/ });
    await user.click(newJobButton);

    // Fill form
    const nameInput = screen.getByLabelText('작업명');
    await user.type(nameInput, 'New Job');

    // Upload file
    const file = new File(['{"text": "sample"}'], 'dataset.jsonl', { type: 'application/jsonl' });
    const uploadInput = screen.getByLabelText(/데이터셋 업로드/) as HTMLInputElement;
    await user.upload(uploadInput, file);

    await waitFor(() => {
      expect(screen.getByText(/업로드 완료/)).toBeInTheDocument();
    });

    // Submit
    const startButton = screen.getByRole('button', { name: '학습 시작' });
    await user.click(startButton);

    await waitFor(() => {
      expect(finetuningService.createJob).toHaveBeenCalledWith({
        name: 'New Job',
        base_model: 'mistral-7b-instruct-v0.2',
        dataset_path: '/datasets/uploaded.jsonl',
        config: {
          epochs: 3,
          batch_size: 4,
          learning_rate: 0.0001,
          gradient_accumulation_steps: 4,
        },
      });
    });
  });

  it('should cancel running job with confirmation', async () => {
    const user = userEvent;
    window.confirm = jest.fn(() => true);
    finetuningService.listJobs.mockResolvedValue(mockJobs);
    finetuningService.cancelJob.mockResolvedValue(undefined);

    render(<FineTuning />);

    await waitFor(() => {
      expect(screen.getByText('Job 1')).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByTitle('취소');
    await user.click(cancelButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith('정말로 이 학습을 취소하시겠습니까?');
    await waitFor(() => {
      expect(finetuningService.cancelJob).toHaveBeenCalledWith(1);
    });
  });

  it('should not cancel job if user cancels confirmation', async () => {
    const user = userEvent;
    window.confirm = jest.fn(() => false);
    finetuningService.listJobs.mockResolvedValue(mockJobs);

    render(<FineTuning />);

    await waitFor(() => {
      expect(screen.getByText('Job 1')).toBeInTheDocument();
    });

    const cancelButtons = screen.getAllByTitle('취소');
    await user.click(cancelButtons[0]);

    expect(window.confirm).toHaveBeenCalled();
    expect(finetuningService.cancelJob).not.toHaveBeenCalled();
  });

  it('should update config values in form', async () => {
    const user = userEvent;
    finetuningService.listJobs.mockResolvedValue([]);
    render(<FineTuning />);

    // Open dialog
    const newJobButton = await screen.findByRole('button', { name: /새 학습 작업/ });
    await user.click(newJobButton);

    // Update epochs
    const epochsInput = screen.getByLabelText('Epochs');
    await user.clear(epochsInput);
    await user.type(epochsInput, '10');

    // Update batch size
    const batchInput = screen.getByLabelText('Batch Size');
    await user.clear(batchInput);
    await user.type(batchInput, '16');

    // Update learning rate
    const lrInput = screen.getByLabelText('Learning Rate');
    await user.clear(lrInput);
    await user.type(lrInput, '0.001');

    // Update gradient steps
    const gradientInput = screen.getByLabelText('Gradient Steps');
    await user.clear(gradientInput);
    await user.type(gradientInput, '8');

    expect(epochsInput).toHaveValue(10);
    expect(batchInput).toHaveValue(16);
    expect(lrInput).toHaveValue(0.001);
    expect(gradientInput).toHaveValue(8);
  });

  it('should disable start button when required fields are missing', async () => {
    const user = userEvent;
    finetuningService.listJobs.mockResolvedValue([]);
    render(<FineTuning />);

    // Open dialog
    const newJobButton = await screen.findByRole('button', { name: /새 학습 작업/ });
    await user.click(newJobButton);

    const startButton = screen.getByRole('button', { name: '학습 시작' });
    
    // Initially disabled (no name, no dataset)
    expect(startButton).toBeDisabled();

    // Add name only
    const nameInput = screen.getByLabelText('작업명');
    await user.type(nameInput, 'Test Job');

    // Still disabled (no dataset)
    expect(startButton).toBeDisabled();

    // Upload dataset
    finetuningService.uploadDataset.mockResolvedValue({ path: '/datasets/test.jsonl' });
    const file = new File(['{"text": "test"}'], 'test.jsonl', { type: 'application/jsonl' });
    const uploadInput = screen.getByLabelText(/데이터셋 업로드/) as HTMLInputElement;
    await user.upload(uploadInput, file);

    await waitFor(() => {
      expect(startButton).toBeEnabled();
    });
  });

  it('should show loading state', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    finetuningService.listJobs.mockReturnValue(promise);

    render(<FineTuning />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    resolvePromise!([]);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should show error message on API failure', async () => {
    finetuningService.listJobs.mockRejectedValue(new Error('API Error'));
    
    render(<FineTuning />);

    await waitFor(() => {
      expect(screen.getByText('학습 작업 목록을 불러오는데 실패했습니다.')).toBeInTheDocument();
    });
  });

  it('should show upload error', async () => {
    const user = userEvent;
    finetuningService.listJobs.mockResolvedValue([]);
    finetuningService.uploadDataset.mockRejectedValue(new Error('Upload failed'));
    
    render(<FineTuning />);

    // Open dialog
    const newJobButton = await screen.findByRole('button', { name: /새 학습 작업/ });
    await user.click(newJobButton);

    // Try to upload
    const file = new File(['{"text": "test"}'], 'test.jsonl', { type: 'application/jsonl' });
    const uploadInput = screen.getByLabelText(/데이터셋 업로드/) as HTMLInputElement;
    await user.upload(uploadInput, file);

    await waitFor(() => {
      expect(screen.getByText('데이터셋 업로드에 실패했습니다.')).toBeInTheDocument();
    });
  });

  it('should manually refresh jobs', async () => {
    const user = userEvent;
    finetuningService.listJobs.mockResolvedValue(mockJobs);
    render(<FineTuning />);

    await waitFor(() => {
      expect(finetuningService.listJobs).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByRole('button', { name: /새로고침/ });
    await user.click(refreshButton);

    expect(finetuningService.listJobs).toHaveBeenCalledTimes(2);
  });

  it('should show progress bar for running jobs', async () => {
    finetuningService.listJobs.mockResolvedValue([mockJobs[0]]); // Only running job
    render(<FineTuning />);

    await waitFor(() => {
      expect(screen.getByText('Job 1')).toBeInTheDocument();
      // Check for LinearProgress component
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveClass('MuiLinearProgress-root');
    });
  });

  it('should show empty state when no jobs', async () => {
    finetuningService.listJobs.mockResolvedValue([]);
    render(<FineTuning />);

    await waitFor(() => {
      expect(screen.getByText('진행중인 학습 작업이 없습니다.')).toBeInTheDocument();
    });
  });

  it('should display job config details', async () => {
    finetuningService.listJobs.mockResolvedValue(mockJobs);
    render(<FineTuning />);

    await waitFor(() => {
      expect(screen.getByText(/Epochs: 3, Batch: 4/)).toBeInTheDocument();
      expect(screen.getByText(/Epochs: 5, Batch: 8/)).toBeInTheDocument();
    });
  });

  it('should clean up interval on unmount', () => {
    finetuningService.listJobs.mockResolvedValue([]);
    const { unmount } = render(<FineTuning />);

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});