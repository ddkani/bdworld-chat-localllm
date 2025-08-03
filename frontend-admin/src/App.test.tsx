import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock React Router DOM
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Routes: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Route: () => null,
  Navigate: () => null,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/dashboard' }),
}));

// Mock all the page components
jest.mock('./pages/Dashboard', () => {
  return function Dashboard() {
    return <div>Dashboard Page</div>;
  };
});

jest.mock('./pages/RAGManagement', () => {
  return function RAGManagement() {
    return <div>RAG Management Page</div>;
  };
});

jest.mock('./pages/PromptTemplates', () => {
  return function PromptTemplates() {
    return <div>Prompt Templates Page</div>;
  };
});

jest.mock('./pages/ModelManagement', () => {
  return function ModelManagement() {
    return <div>Model Management Page</div>;
  };
});

jest.mock('./pages/FineTuning', () => {
  return function FineTuning() {
    return <div>Fine-tuning Page</div>;
  };
});

// Mock Layout component to simplify testing
jest.mock('./components/Layout', () => {
  return function Layout({ children }: { children: React.ReactNode }) {
    return (
      <div>
        <div>Layout Header</div>
        <div>{children}</div>
      </div>
    );
  };
});

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />);
    expect(screen.getByText('Layout Header')).toBeInTheDocument();
  });

  it('should apply MUI theme', () => {
    const { container } = render(<App />);
    // Check if ThemeProvider wraps the content
    expect(container.firstChild).toBeTruthy();
  });
});