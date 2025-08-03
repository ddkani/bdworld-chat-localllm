import axios from 'axios';
import { API_BASE_URL } from '../config';
import { RAGDocument, PromptTemplate, ModelInfo, TrainingJob } from '../types';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// RAG API
export const ragService = {
  listDocuments: async (query?: string, limit: number = 20): Promise<RAGDocument[]> => {
    const response = await api.get('/rag/documents', { params: { query, limit } });
    return response.data;
  },

  addDocument: async (content: string, metadata?: Record<string, any>): Promise<RAGDocument> => {
    const response = await api.post('/rag/documents', { content, metadata });
    return response.data;
  },

  deleteDocument: async (id: number): Promise<void> => {
    await api.delete(`/rag/documents/${id}`);
  },

  searchSimilar: async (query: string, topK: number = 5): Promise<RAGDocument[]> => {
    const response = await api.post('/rag/search', { query, top_k: topK });
    return response.data;
  },
};

// Prompt Template API
export const promptService = {
  list: async (): Promise<PromptTemplate[]> => {
    const response = await api.get('/prompts');
    return response.data;
  },

  create: async (data: Omit<PromptTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<PromptTemplate> => {
    const response = await api.post('/prompts', data);
    return response.data;
  },

  update: async (id: number, data: Partial<PromptTemplate>): Promise<PromptTemplate> => {
    const response = await api.patch(`/prompts/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/prompts/${id}`);
  },

  activate: async (id: number): Promise<PromptTemplate> => {
    const response = await api.post(`/prompts/${id}/activate`);
    return response.data;
  },
};

// Model Management API
export const modelService = {
  getInfo: async (): Promise<ModelInfo> => {
    const response = await api.get('/models/info');
    return response.data;
  },

  download: async (): Promise<{ task_id: string }> => {
    const response = await api.post('/models/download');
    return response.data;
  },

  getDownloadProgress: async (taskId: string): Promise<{ progress: number; status: string }> => {
    const response = await api.get(`/models/download/${taskId}`);
    return response.data;
  },
};

// Fine-tuning API
export const finetuningService = {
  listJobs: async (): Promise<TrainingJob[]> => {
    const response = await api.get('/finetuning/jobs');
    return response.data;
  },

  createJob: async (data: Omit<TrainingJob, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<TrainingJob> => {
    const response = await api.post('/finetuning/jobs', data);
    return response.data;
  },

  getJob: async (id: number): Promise<TrainingJob> => {
    const response = await api.get(`/finetuning/jobs/${id}`);
    return response.data;
  },

  cancelJob: async (id: number): Promise<void> => {
    await api.post(`/finetuning/jobs/${id}/cancel`);
  },

  uploadDataset: async (file: File): Promise<{ filename: string; path: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/finetuning/datasets', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
};