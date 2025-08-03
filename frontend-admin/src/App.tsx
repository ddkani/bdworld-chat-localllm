import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import RAGManagement from './pages/RAGManagement';
import PromptTemplates from './pages/PromptTemplates';
import ModelManagement from './pages/ModelManagement';
import FineTuning from './pages/FineTuning';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/rag" element={<RAGManagement />} />
            <Route path="/prompts" element={<PromptTemplates />} />
            <Route path="/models" element={<ModelManagement />} />
            <Route path="/finetuning" element={<FineTuning />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
