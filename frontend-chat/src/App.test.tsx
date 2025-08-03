import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import * as AuthModule from './contexts/AuthContext';

// Mock modules
jest.mock('./contexts/AuthContext', () => ({
  ...jest.requireActual('./contexts/AuthContext'),
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock components to avoid deep rendering
jest.mock('./components/Login', () => {
  return function Login() {
    return <div>Login Component</div>;
  };
});

jest.mock('./pages/Chat', () => {
  return function Chat() {
    return <div>Chat Component</div>;
  };
});

describe('App Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    (AuthModule.useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<App />);
    
    // Should redirect to login when not authenticated
    expect(screen.getByText('Login Component')).toBeInTheDocument();
  });

  it('should render chat when authenticated', () => {
    (AuthModule.useAuth as jest.Mock).mockReturnValue({
      user: { id: 1, username: 'testuser', created_at: '2024-01-01', last_login: '2024-01-01' },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      checkAuth: jest.fn(),
    });

    render(<App />);
    
    // Should show chat when authenticated
    expect(screen.getByText('Chat Component')).toBeInTheDocument();
  });
});