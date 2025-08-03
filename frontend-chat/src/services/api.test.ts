import axios from 'axios';
import { authService, sessionService, ragService, promptService } from './api';
import { API_BASE_URL, ENDPOINTS } from '../config';

// Mock modules
jest.mock('axios');

const mockedAxios = {
  create: jest.fn(() => mockAxiosInstance),
  defaults: {},
  interceptors: {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  },
} as unknown as jest.Mocked<typeof axios>;

const mockAxiosInstance = {
  defaults: {
    baseURL: API_BASE_URL,
    withCredentials: true,
  },
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
};

// Replace axios with our mock
(axios as any).create = mockedAxios.create;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
  });

  describe('Auth Service', () => {
    it('should login user', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: undefined });

      await authService.login('testuser');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        ENDPOINTS.auth.login,
        { username: 'testuser' }
      );
    });

    it('should logout user', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({ data: undefined });

      await authService.logout();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(ENDPOINTS.auth.logout);
    });

    it('should get current user', async () => {
      const mockUser = { 
        id: 1, 
        username: 'testuser',
        created_at: '2024-01-01',
        last_login: '2024-01-01'
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockUser });

      const result = await authService.getCurrentUser();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(ENDPOINTS.auth.user);
      expect(result).toEqual({ user: mockUser });
    });
  });

  describe('Session Service', () => {
    it('should list sessions', async () => {
      const mockSessions = [
        { id: 1, title: 'Session 1' },
        { id: 2, title: 'Session 2' },
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockSessions });

      const result = await sessionService.list();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(ENDPOINTS.sessions.list);
      expect(result).toEqual(mockSessions);
    });

    it('should create session', async () => {
      const mockSession = { 
        id: 1, 
        title: '새 대화',
        created_at: '2024-01-01T10:00:00Z' 
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockSession });

      const result = await sessionService.create();

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        ENDPOINTS.sessions.list,
        { title: undefined }
      );
      expect(result).toEqual(mockSession);
    });

    it('should create session with title', async () => {
      const mockSession = { 
        id: 1, 
        title: '커스텀 제목',
        created_at: '2024-01-01T10:00:00Z' 
      };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockSession });

      const result = await sessionService.create('커스텀 제목');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        ENDPOINTS.sessions.list,
        { title: '커스텀 제목' }
      );
      expect(result).toEqual(mockSession);
    });

    it('should get session by id', async () => {
      const mockSession = { 
        id: 1, 
        title: 'Session 1',
        messages: [] 
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockSession });

      const result = await sessionService.get(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(ENDPOINTS.sessions.detail(1));
      expect(result).toEqual(mockSession);
    });

    it('should update session', async () => {
      const mockSession = { 
        id: 1, 
        title: 'Updated Title' 
      };
      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockSession });

      const result = await sessionService.update(1, { title: 'Updated Title' });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        ENDPOINTS.sessions.detail(1),
        { title: 'Updated Title' }
      );
      expect(result).toEqual(mockSession);
    });

    it('should delete session', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: {} });

      await sessionService.delete(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        ENDPOINTS.sessions.detail(1)
      );
    });

    it('should get messages for session', async () => {
      const mockMessages = [
        { id: 1, role: 'user', content: 'Hello' },
        { id: 2, role: 'assistant', content: 'Hi there!' },
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockMessages });

      const result = await sessionService.getMessages(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        ENDPOINTS.sessions.messages(1)
      );
      expect(result).toEqual(mockMessages);
    });
  });

  describe('RAG Service', () => {
    it('should get documents', async () => {
      const mockDocuments = [
        { id: 1, filename: 'doc1.pdf' },
        { id: 2, filename: 'doc2.pdf' },
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockDocuments });

      const result = await ragService.listDocuments();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(ENDPOINTS.rag.documents);
      expect(result).toEqual(mockDocuments);
    });

    it('should create document', async () => {
      const mockDocument = { id: 1, filename: 'uploaded.pdf', content: 'test content' };
      const documentData = { filename: 'test.pdf', content: 'test content' };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockDocument });

      const result = await ragService.createDocument(documentData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        ENDPOINTS.rag.documents,
        documentData
      );
      expect(result).toEqual(mockDocument);
    });

    // Search documents test removed - method not in ragService

    it('should get document by id', async () => {
      const mockDocument = { id: 1, filename: 'doc.pdf', content: 'content' };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockDocument });

      const result = await ragService.getDocument(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        ENDPOINTS.rag.documentDetail(1)
      );
      expect(result).toEqual(mockDocument);
    });

    it('should delete document', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: {} });

      await ragService.deleteDocument(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        ENDPOINTS.rag.documentDetail(1)
      );
    });
  });

  describe('Prompt Service', () => {
    it('should list templates', async () => {
      const mockTemplates = [
        { id: 1, name: 'Template 1', template: 'Hello {name}' },
        { id: 2, name: 'Template 2', template: 'Hi {user}' },
      ];
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTemplates });

      const result = await promptService.listTemplates();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(ENDPOINTS.prompts.templates);
      expect(result).toEqual(mockTemplates);
    });

    it('should create template', async () => {
      const mockTemplate = { 
        id: 1, 
        name: 'New Template',
        template: 'Hello {name}'
      };
      const templateData = { name: 'New Template', template: 'Hello {name}' };
      mockAxiosInstance.post.mockResolvedValueOnce({ data: mockTemplate });

      const result = await promptService.createTemplate(templateData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        ENDPOINTS.prompts.templates,
        templateData
      );
      expect(result).toEqual(mockTemplate);
    });

    it('should get template by id', async () => {
      const mockTemplate = { 
        id: 1, 
        name: 'Template 1',
        template: 'Hello {name}'
      };
      mockAxiosInstance.get.mockResolvedValueOnce({ data: mockTemplate });

      const result = await promptService.getTemplate(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        ENDPOINTS.prompts.templateDetail(1)
      );
      expect(result).toEqual(mockTemplate);
    });

    it('should update template', async () => {
      const mockTemplate = { 
        id: 1, 
        name: 'Updated Template',
        template: 'Hi {name}'
      };
      const updateData = { name: 'Updated Template' };
      mockAxiosInstance.put.mockResolvedValueOnce({ data: mockTemplate });

      const result = await promptService.updateTemplate(1, updateData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        ENDPOINTS.prompts.templateDetail(1),
        updateData
      );
      expect(result).toEqual(mockTemplate);
    });

    it('should delete template', async () => {
      mockAxiosInstance.delete.mockResolvedValueOnce({ data: {} });

      await promptService.deleteTemplate(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        ENDPOINTS.prompts.templateDetail(1)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network error', async () => {
      const networkError = new Error('Network Error');
      mockAxiosInstance.get.mockRejectedValueOnce(networkError);

      await expect(sessionService.list()).rejects.toThrow('Network Error');
    });

    it('should handle API error response', async () => {
      const apiError = {
        response: {
          data: { detail: '인증이 필요합니다' },
          status: 401,
        },
      };
      mockAxiosInstance.get.mockRejectedValueOnce(apiError);

      await expect(sessionService.list()).rejects.toEqual(apiError);
    });

    it('should handle timeout error', async () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
      };
      mockAxiosInstance.get.mockRejectedValueOnce(timeoutError);

      await expect(sessionService.list()).rejects.toEqual(timeoutError);
    });
  });

  describe('Request Configuration', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: API_BASE_URL,
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true,
      });
    });

    it('should setup request interceptor', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });

    it('should setup response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });
});