import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('Layout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderLayout = (initialPath = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Layout>
          <div>Test Content</div>
        </Layout>
      </MemoryRouter>
    );
  };

  it('should render layout with app bar', () => {
    renderLayout();
    
    expect(screen.getByText('LLM 관리자 대시보드')).toBeInTheDocument();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('should render all menu items', () => {
    renderLayout();
    
    expect(screen.getByText('대시보드')).toBeInTheDocument();
    expect(screen.getByText('RAG 관리')).toBeInTheDocument();
    expect(screen.getByText('프롬프트 템플릿')).toBeInTheDocument();
    expect(screen.getByText('모델 관리')).toBeInTheDocument();
    expect(screen.getByText('Fine-tuning')).toBeInTheDocument();
  });

  it('should render children content', () => {
    renderLayout();
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should highlight active menu item based on current path', () => {
    renderLayout('/rag');
    
    const ragButton = screen.getByRole('button', { name: /RAG 관리/ });
    expect(ragButton).toHaveClass('Mui-selected');
  });

  it('should navigate to dashboard when clicking dashboard menu', async () => {
    const user = userEvent;
    renderLayout();
    
    await user.click(screen.getByText('대시보드'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should navigate to RAG management when clicking RAG menu', async () => {
    const user = userEvent;
    renderLayout();
    
    await user.click(screen.getByText('RAG 관리'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/rag');
  });

  it('should navigate to prompt templates when clicking prompts menu', async () => {
    const user = userEvent;
    renderLayout();
    
    await user.click(screen.getByText('프롬프트 템플릿'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/prompts');
  });

  it('should navigate to model management when clicking models menu', async () => {
    const user = userEvent;
    renderLayout();
    
    await user.click(screen.getByText('모델 관리'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/models');
  });

  it('should navigate to fine-tuning when clicking finetuning menu', async () => {
    const user = userEvent;
    renderLayout();
    
    await user.click(screen.getByText('Fine-tuning'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/finetuning');
  });

  it('should have permanent drawer', () => {
    const { container } = renderLayout();
    
    const drawer = container.querySelector('.MuiDrawer-root');
    expect(drawer).toHaveClass('MuiDrawer-docked');
  });

  it('should have correct drawer width', () => {
    const { container } = renderLayout();
    
    const drawerPaper = container.querySelector('.MuiDrawer-paper');
    expect(drawerPaper).toHaveStyle({ width: '240px' });
  });
});