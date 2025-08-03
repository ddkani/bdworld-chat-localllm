import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config';
import { User, ChatSession, Message, RAGDocument, PromptTemplate } from '../types';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (username: string): Promise<{ user: User; message: string }> => {
    const response = await api.post(ENDPOINTS.auth.login, { username });
    return response.data;
  },

  logout: async (): Promise<{ message: string }> => {
    const response = await api.post(ENDPOINTS.auth.logout);
    return response.data;
  },

  getCurrentUser: async (): Promise<{ user: User }> => {
    const response = await api.get(ENDPOINTS.auth.user);
    return response.data;
  },
};

// Session services
export const sessionService = {
  list: async (): Promise<ChatSession[]> => {
    const response = await api.get(ENDPOINTS.sessions.list);
    return response.data;
  },

  create: async (title?: string): Promise<ChatSession> => {
    const response = await api.post(ENDPOINTS.sessions.list, { title });
    return response.data;
  },

  get: async (id: number): Promise<ChatSession> => {
    const response = await api.get(ENDPOINTS.sessions.detail(id));
    return response.data;
  },

  update: async (id: number, data: Partial<ChatSession>): Promise<ChatSession> => {
    const response = await api.put(ENDPOINTS.sessions.detail(id), data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(ENDPOINTS.sessions.detail(id));
  },

  getMessages: async (id: number): Promise<Message[]> => {
    const response = await api.get(ENDPOINTS.sessions.messages(id));
    return response.data;
  },
};

// RAG services
export const ragService = {
  listDocuments: async (): Promise<RAGDocument[]> => {
    const response = await api.get(ENDPOINTS.rag.documents);
    return response.data;
  },

  createDocument: async (data: Partial<RAGDocument>): Promise<RAGDocument> => {
    const response = await api.post(ENDPOINTS.rag.documents, data);
    return response.data;
  },

  getDocument: async (id: number): Promise<RAGDocument> => {
    const response = await api.get(ENDPOINTS.rag.documentDetail(id));
    return response.data;
  },

  updateDocument: async (id: number, data: Partial<RAGDocument>): Promise<RAGDocument> => {
    const response = await api.put(ENDPOINTS.rag.documentDetail(id), data);
    return response.data;
  },

  deleteDocument: async (id: number): Promise<void> => {
    await api.delete(ENDPOINTS.rag.documentDetail(id));
  },
};

// Prompt template services
export const promptService = {
  listTemplates: async (): Promise<PromptTemplate[]> => {
    const response = await api.get(ENDPOINTS.prompts.templates);
    return response.data;
  },

  createTemplate: async (data: Partial<PromptTemplate>): Promise<PromptTemplate> => {
    const response = await api.post(ENDPOINTS.prompts.templates, data);
    return response.data;
  },

  getTemplate: async (id: number): Promise<PromptTemplate> => {
    const response = await api.get(ENDPOINTS.prompts.templateDetail(id));
    return response.data;
  },

  updateTemplate: async (id: number, data: Partial<PromptTemplate>): Promise<PromptTemplate> => {
    const response = await api.put(ENDPOINTS.prompts.templateDetail(id), data);
    return response.data;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await api.delete(ENDPOINTS.prompts.templateDetail(id));
  },
};

export default api;