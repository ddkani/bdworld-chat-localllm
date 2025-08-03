import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import * as AuthModule from '../contexts/AuthContext';

// Mock auth context
jest.mock('../contexts/AuthContext', () => ({
  ...jest.requireActual('../contexts/AuthContext'),
  useAuth: jest.fn(),
}));

// Mock components
const PublicPage = () => <div>Public Page</div>;
const PrivatePage = () => <div>Private Page</div>;
const LoginPage = () => <div>Login Page</div>;

// Helper function to render with router
const renderWithRouter = (
  initialRoute: string,
  authValue: any
) => {
  (AuthModule.useAuth as jest.Mock).mockReturnValue(authValue);
  
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/public" element={<PublicPage />} />
        <Route
          path="/private"
          element={
            <PrivateRoute>
              <PrivatePage />
            </PrivateRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

describe('PrivateRoute Component', () => {
  const mockUseAuth = {
    user: null,
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    checkAuth: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to login when user is not authenticated', () => {
    renderWithRouter('/private', mockUseAuth);

    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Private Page')).not.toBeInTheDocument();
  });

  it('should render protected component when user is authenticated', () => {
    const authWithUser = {
      ...mockUseAuth,
      user: { id: 1, username: 'testuser', created_at: '2024-01-01', last_login: '2024-01-01' },
    };

    renderWithRouter('/private', authWithUser);

    expect(screen.getByText('Private Page')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('should show loading state', () => {
    const authLoading = {
      ...mockUseAuth,
      loading: true,
    };

    renderWithRouter('/private', authLoading);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByText('Private Page')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('should navigate to public routes without authentication', () => {
    renderWithRouter('/public', mockUseAuth);

    expect(screen.getByText('Public Page')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('should preserve location state when redirecting', () => {
    const { container } = renderWithRouter('/private?query=test#hash', mockUseAuth);

    // Check if Navigate component is rendered with state prop
    const navigateElement = container.querySelector('[to="/login"]');
    expect(navigateElement).toBeTruthy();
  });

  it('should render children when authenticated after loading', () => {
    // Start with loading
    const { rerender } = renderWithRouter('/private', { ...mockUseAuth, loading: true });

    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Update to authenticated
    (AuthModule.useAuth as jest.Mock).mockReturnValue({
      ...mockUseAuth,
      loading: false,
      user: { id: 1, username: 'testuser', created_at: '2024-01-01', last_login: '2024-01-01' },
    });

    rerender(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/public" element={<PublicPage />} />
          <Route
            path="/private"
            element={
              <PrivateRoute>
                <PrivatePage />
              </PrivateRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Private Page')).toBeInTheDocument();
  });
});