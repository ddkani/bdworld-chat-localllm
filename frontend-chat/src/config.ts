export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
export const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

export const ENDPOINTS = {
  auth: {
    login: '/auth/login/',
    logout: '/auth/logout/',
    user: '/auth/user/',
  },
  sessions: {
    list: '/sessions/',
    detail: (id: number) => `/sessions/${id}/`,
    messages: (id: number) => `/sessions/${id}/messages/`,
  },
  rag: {
    documents: '/rag/documents/',
    documentDetail: (id: number) => `/rag/documents/${id}/`,
  },
  prompts: {
    templates: '/prompts/templates/',
    templateDetail: (id: number) => `/prompts/templates/${id}/`,
  },
};