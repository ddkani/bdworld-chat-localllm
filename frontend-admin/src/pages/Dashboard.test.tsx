import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );
  };

  it('should render dashboard title', () => {
    renderDashboard();
    
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('LLM 시스템 관리 대시보드에 오신 것을 환영합니다.')).toBeInTheDocument();
  });

  it('should render all management cards', () => {
    renderDashboard();
    
    expect(screen.getByText('RAG 문서 관리')).toBeInTheDocument();
    expect(screen.getByText('프롬프트 템플릿')).toBeInTheDocument();
    expect(screen.getByText('모델 관리')).toBeInTheDocument();
    expect(screen.getByText('Fine-tuning')).toBeInTheDocument();
  });

  it('should display card descriptions', () => {
    renderDashboard();
    
    expect(screen.getByText('RAG 시스템에 문서를 추가하고 관리합니다.')).toBeInTheDocument();
    expect(screen.getByText('시스템 프롬프트와 예제를 관리합니다.')).toBeInTheDocument();
    expect(screen.getByText('LLM 모델을 다운로드하고 관리합니다.')).toBeInTheDocument();
    expect(screen.getByText('모델을 커스텀 데이터로 학습시킵니다.')).toBeInTheDocument();
  });

  it('should display stats', () => {
    renderDashboard();
    
    expect(screen.getByText('0개 문서')).toBeInTheDocument();
    expect(screen.getByText('0개 템플릿')).toBeInTheDocument();
    expect(screen.getByText('모델 없음')).toBeInTheDocument();
    expect(screen.getByText('0개 작업')).toBeInTheDocument();
  });

  it('should navigate to RAG management when clicking RAG card', async () => {
    const user = userEvent;
    renderDashboard();
    
    const ragButton = screen.getAllByText('관리하기')[0];
    await user.click(ragButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/rag');
  });

  it('should navigate to prompt templates when clicking prompts card', async () => {
    const user = userEvent;
    renderDashboard();
    
    const promptsButton = screen.getAllByText('관리하기')[1];
    await user.click(promptsButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/prompts');
  });

  it('should navigate to model management when clicking models card', async () => {
    const user = userEvent;
    renderDashboard();
    
    const modelsButton = screen.getAllByText('관리하기')[2];
    await user.click(modelsButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/models');
  });

  it('should navigate to fine-tuning when clicking finetuning card', async () => {
    const user = userEvent;
    renderDashboard();
    
    const finetuningButton = screen.getAllByText('관리하기')[3];
    await user.click(finetuningButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/finetuning');
  });

  it('should display system info', () => {
    renderDashboard();
    
    expect(screen.getByText('시스템 정보')).toBeInTheDocument();
    expect(screen.getByText('백엔드 URL: http://localhost:8000')).toBeInTheDocument();
    expect(screen.getByText('모델 경로: models/')).toBeInTheDocument();
  });
});