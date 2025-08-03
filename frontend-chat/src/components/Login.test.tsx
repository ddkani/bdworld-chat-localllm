import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';
import * as AuthModule from '../contexts/AuthContext';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock useAuth hook
jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'),
  useAuth: jest.fn(),
}));

// Mock auth hook return value
const mockLogin = jest.fn();
const mockUseAuth = {
  user: null,
  loading: false,
  login: mockLogin,
  logout: jest.fn(),
  checkAuth: jest.fn(),
};

const renderLogin = (authOverrides = {}) => {
  (AuthModule.useAuth as jest.Mock).mockReturnValue({
    ...mockUseAuth,
    ...authOverrides,
  });
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render login form', () => {
    renderLogin();

    expect(screen.getByText('AI 챗봇')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('사용자 이름')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument();
  });


  it('should show error message when login fails', async () => {
    const user = userEvent;
    mockLogin.mockRejectedValue(new Error('Login failed'));
    renderLogin();

    const usernameInput = screen.getByPlaceholderText('사용자 이름');
    const submitButton = screen.getByRole('button', { name: '로그인' });

    await user.type(usernameInput, 'testuser');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('로그인 실패')).toBeInTheDocument();
    });
  });

  it('should handle form submission with username', async () => {
    const user = userEvent;
    renderLogin();

    const usernameInput = screen.getByPlaceholderText('사용자 이름');
    const submitButton = screen.getByRole('button', { name: '로그인' });

    await user.type(usernameInput, 'testuser');
    await user.click(submitButton);

    expect(mockLogin).toHaveBeenCalledWith('testuser');
  });

  it('should prevent submission with empty username', async () => {
    const user = userEvent;
    renderLogin();

    const submitButton = screen.getByRole('button', { name: '로그인' });
    await user.click(submitButton);

    expect(mockLogin).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('사용자 이름이 필요합니다')).toBeInTheDocument();
    });
  });

  it('should trim whitespace from username', async () => {
    const user = userEvent;
    renderLogin();

    const usernameInput = screen.getByPlaceholderText('사용자 이름');
    const submitButton = screen.getByRole('button', { name: '로그인' });

    await user.type(usernameInput, '  testuser  ');
    await user.click(submitButton);

    expect(mockLogin).toHaveBeenCalledWith('testuser');
  });

  it('should handle Enter key submission', async () => {
    const user = userEvent;
    renderLogin();

    const usernameInput = screen.getByPlaceholderText('사용자 이름');
    
    await user.type(usernameInput, 'testuser');
    await user.keyboard('{Enter}');

    expect(mockLogin).toHaveBeenCalledWith('testuser');
  });

  it('should navigate to chat after successful login', async () => {
    mockLogin.mockImplementation((username) => {
      // Simulate successful login
    });

    const user = userEvent;
    renderLogin();

    const usernameInput = screen.getByPlaceholderText('사용자 이름');
    const submitButton = screen.getByRole('button', { name: '로그인' });

    await user.type(usernameInput, 'testuser');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/chat');
    });
  });

  it('should disable form during login process', async () => {
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });

    mockLogin.mockReturnValue(loginPromise);

    const user = userEvent;
    renderLogin();

    const usernameInput = screen.getByPlaceholderText('사용자 이름');
    const submitButton = screen.getByRole('button', { name: '로그인' });

    await user.type(usernameInput, 'testuser');
    await user.click(submitButton);

    // Check if input and button are disabled during login
    expect(usernameInput).toBeDisabled();
    expect(submitButton).toBeDisabled();

    // Resolve the login promise
    resolveLogin!(undefined);

    await waitFor(() => {
      expect(usernameInput).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });
  });
});