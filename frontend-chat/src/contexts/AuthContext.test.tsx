import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { authService } from '../services/api';

// Mock api service
jest.mock('../services/api');
const mockedAuthService = authService as jest.Mocked<typeof authService>;

// Test component that uses the auth context
const TestComponent: React.FC = () => {
  const { user, loading } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user ? user.username : 'null'}</div>
    </div>
  );
};

// Test component with auth actions
const TestAuthActions: React.FC = () => {
  const { login, logout } = useAuth();
  
  return (
    <div>
      <button onClick={() => login('testuser')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error when useAuth is used outside of AuthProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within an AuthProvider');

    console.error = originalError;
  });

  it('should provide auth context values', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toBeInTheDocument();
    expect(screen.getByTestId('user')).toBeInTheDocument();
  });

  it('should check authentication on mount', async () => {
    mockedAuthService.getCurrentUser.mockResolvedValueOnce({
      user: {
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01',
        last_login: '2024-01-01',
      }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('true');

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('testuser');
    });

    expect(mockedAuthService.getCurrentUser).toHaveBeenCalled();
  });

  it('should handle authentication check failure', async () => {
    mockedAuthService.getCurrentUser.mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('should handle login', async () => {
    mockedAuthService.login.mockResolvedValueOnce({
      user: {
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01',
        last_login: '2024-01-01',
      },
      message: 'Login successful'
    });
    mockedAuthService.getCurrentUser.mockResolvedValueOnce({
      user: {
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01',
        last_login: '2024-01-01',
      }
    });

    render(
      <AuthProvider>
        <TestComponent />
        <TestAuthActions />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('testuser');
    });

    expect(mockedAuthService.login).toHaveBeenCalledWith('testuser');
    expect(mockedAuthService.getCurrentUser).toHaveBeenCalled();
  });

  it('should handle login failure', async () => {
    mockedAuthService.login.mockRejectedValueOnce(
      new Error('Invalid username')
    );

    render(
      <AuthProvider>
        <TestComponent />
        <TestAuthActions />
      </AuthProvider>
    );

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    expect(mockedAuthService.login).toHaveBeenCalledWith('testuser');
  });

  it('should handle logout', async () => {
    // Start with a logged in user
    mockedAuthService.getCurrentUser.mockResolvedValueOnce({
      user: {
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01',
        last_login: '2024-01-01',
      }
    });
    mockedAuthService.logout.mockResolvedValueOnce({ message: 'Logout successful' });

    render(
      <AuthProvider>
        <TestComponent />
        <TestAuthActions />
      </AuthProvider>
    );

    // Wait for initial auth check
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('testuser');
    });

    const logoutButton = screen.getByText('Logout');
    
    await act(async () => {
      logoutButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });

    expect(mockedAuthService.logout).toHaveBeenCalled();
  });

  it('should handle logout failure gracefully', async () => {
    mockedAuthService.getCurrentUser.mockResolvedValueOnce({
      user: {
        id: 1,
        username: 'testuser',
        created_at: '2024-01-01',
        last_login: '2024-01-01',
      }
    });
    mockedAuthService.logout.mockRejectedValueOnce(new Error('Network error'));

    render(
      <AuthProvider>
        <TestComponent />
        <TestAuthActions />
      </AuthProvider>
    );

    // Wait for initial auth check
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('testuser');
    });

    const logoutButton = screen.getByText('Logout');
    
    await act(async () => {
      logoutButton.click();
    });

    // User should still be cleared even if logout fails
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('null');
    });
  });

  it('should provide checkAuth function', async () => {
    const TestCheckAuth: React.FC = () => {
      const { checkAuth } = useAuth();
      
      return (
        <button onClick={checkAuth}>Check Auth</button>
      );
    };

    mockedAuthService.getCurrentUser
      .mockResolvedValueOnce({
        user: {
          id: 1,
          username: 'user1',
          created_at: '2024-01-01',
          last_login: '2024-01-01',
        }
      })
      .mockResolvedValueOnce({
        user: {
          id: 1,
          username: 'user2',
          created_at: '2024-01-01',
          last_login: '2024-01-01',
        }
      });

    render(
      <AuthProvider>
        <TestComponent />
        <TestCheckAuth />
      </AuthProvider>
    );

    // Wait for initial check
    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('user1');
    });

    const checkAuthButton = screen.getByText('Check Auth');
    
    await act(async () => {
      checkAuthButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('user2');
    });

    expect(mockedAuthService.getCurrentUser).toHaveBeenCalledTimes(2);
  });
});