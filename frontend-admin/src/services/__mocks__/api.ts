export const ragService = {
  listDocuments: jest.fn(),
  addDocument: jest.fn(),
  deleteDocument: jest.fn(),
  searchSimilar: jest.fn(),
};

export const promptService = {
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  activate: jest.fn(),
};

export const modelService = {
  getInfo: jest.fn(),
  download: jest.fn(),
  getDownloadProgress: jest.fn(),
  cancelDownload: jest.fn(),
  updateModelPath: jest.fn(),
};

export const finetuningService = {
  listJobs: jest.fn(),
  createJob: jest.fn(),
  getJob: jest.fn(),
  cancelJob: jest.fn(),
  uploadDataset: jest.fn(),
};