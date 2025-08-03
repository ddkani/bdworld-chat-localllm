import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ModelManagement from './ModelManagement';
import { modelService } from '../services/api';

// Mock the api service
jest.mock('../services/api');

describe('ModelManagement Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockModelInfo = {
    model_path: '/models/llama-2-7b',
    exists: true,
    size: 13476897792, // ~13GB
  };

  const mockModelNotExists = {
    model_path: '/models/llama-2-7b',
    exists: false,
  };

  it('should render component title', () => {
    render(<ModelManagement />);
    expect(screen.getByText('모델 관리')).toBeInTheDocument();
  });

  it('should load model info on mount', async () => {
    modelService.getInfo.mockResolvedValue(mockModelInfo);
    render(<ModelManagement />);

    await waitFor(() => {
      expect(modelService.getInfo).toHaveBeenCalled();
    });
  });

  it('should display model info when model exists', async () => {
    modelService.getInfo.mockResolvedValue(mockModelInfo);
    render(<ModelManagement />);

    await waitFor(() => {
      expect(screen.getByText('모델 정보')).toBeInTheDocument();
      expect(screen.getByText('모델이 설치되어 있습니다')).toBeInTheDocument();
      expect(screen.getByText(/13\.\d+ GB/)).toBeInTheDocument();
      expect(screen.getByText(/\/models\/llama-2-7b/)).toBeInTheDocument();
    });
  });

  it('should show download button when model does not exist', async () => {
    modelService.getInfo.mockResolvedValue(mockModelNotExists);
    render(<ModelManagement />);

    await waitFor(() => {
      expect(screen.getByText('모델이 설치되어 있지 않습니다')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /모델 다운로드/ })).toBeInTheDocument();
    });
  });

  it('should start model download', async () => {
    const user = userEvent;
    modelService.getInfo.mockResolvedValue(mockModelNotExists);
    modelService.download.mockResolvedValue({ task_id: 'task-123' });

    render(<ModelManagement />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /모델 다운로드/ })).toBeInTheDocument();
    });

    const downloadButton = screen.getByRole('button', { name: /모델 다운로드/ });
    await user.click(downloadButton);

    expect(modelService.download).toHaveBeenCalled();
  });

  it('should show download progress', async () => {
    const user = userEvent;
    modelService.getInfo.mockResolvedValue(mockModelNotExists);
    modelService.download.mockResolvedValue({ task_id: 'task-123' });
    modelService.getDownloadProgress
      .mockResolvedValueOnce({ progress: 25, status: 'downloading' })
      .mockResolvedValueOnce({ progress: 50, status: 'downloading' })
      .mockResolvedValueOnce({ progress: 100, status: 'completed' });

    render(<ModelManagement />);

    const downloadButton = await screen.findByRole('button', { name: /모델 다운로드/ });
    await user.click(downloadButton);

    // Should show progress bar
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  it('should show loading state', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    modelService.getInfo.mockReturnValue(promise);

    render(<ModelManagement />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    resolvePromise!(mockModelInfo);
    
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  it('should show error message on API failure', async () => {
    modelService.getInfo.mockRejectedValue(new Error('API Error'));
    
    render(<ModelManagement />);

    await waitFor(() => {
      expect(screen.getByText('모델 정보를 불러오는데 실패했습니다.')).toBeInTheDocument();
    });
  });

  it('should show download error', async () => {
    const user = userEvent;
    modelService.getInfo.mockResolvedValue(mockModelNotExists);
    modelService.download.mockRejectedValue(new Error('Download failed'));

    render(<ModelManagement />);

    const downloadButton = await screen.findByRole('button', { name: /모델 다운로드/ });
    await user.click(downloadButton);

    await waitFor(() => {
      expect(screen.getByText('모델 다운로드를 시작하는데 실패했습니다.')).toBeInTheDocument();
    });
  });

  it('should format file size correctly', async () => {
    const testCases = [
      { size: 1024 * 1024, expected: '0.00 GB' },
      { size: 1024 * 1024 * 1024, expected: '1.00 GB' },
      { size: 13476897792, expected: '12.5' }, // Will match any 12.5X GB
    ];

    for (const testCase of testCases) {
      modelService.getInfo.mockResolvedValue({
        ...mockModelInfo,
        size: testCase.size,
      });

      const { rerender } = render(<ModelManagement />);

      await waitFor(() => {
        expect(screen.getByText(new RegExp(testCase.expected))).toBeInTheDocument();
      });

      rerender(<></>);
    }
  });

  it('should show model specifications', async () => {
    modelService.getInfo.mockResolvedValue(mockModelInfo);
    render(<ModelManagement />);

    await waitFor(() => {
      expect(screen.getByText('모델 사양')).toBeInTheDocument();
      expect(screen.getByText('Mistral 7B Instruct v0.2')).toBeInTheDocument();
      expect(screen.getByText('Q4_K_M (4-bit quantization)')).toBeInTheDocument();
      expect(screen.getByText('4,096 토큰')).toBeInTheDocument();
      expect(screen.getByText('8GB RAM 이상')).toBeInTheDocument();
    });
  });
});