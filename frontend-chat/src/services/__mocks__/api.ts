export const authService = {
  login: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(),
};

export const sessionService = {
  list: jest.fn(),
  create: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getMessages: jest.fn(),
};

export const ragService = {
  getDocuments: jest.fn(),
  uploadDocument: jest.fn(),
  searchDocuments: jest.fn(),
  getDocument: jest.fn(),
  deleteDocument: jest.fn(),
};

export const promptService = {
  listTemplates: jest.fn(),
  createTemplate: jest.fn(),
  getTemplate: jest.fn(),
  updateTemplate: jest.fn(),
  deleteTemplate: jest.fn(),
};

// Export default axios instance mock
const mockAxios: any = {
  defaults: {
    baseURL: '',
    withCredentials: false,
  },
  interceptors: {
    request: {
      use: jest.fn(),
      eject: jest.fn(),
    },
    response: {
      use: jest.fn(),
      eject: jest.fn(),
    },
  },
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  patch: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
  create: jest.fn(function (config) {
    return { ...mockAxios, ...config };
  }),
};

export default mockAxios;