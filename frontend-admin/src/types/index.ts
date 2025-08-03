export interface User {
  id: number;
  username: string;
  email: string;
  is_superuser: boolean;
}

export interface RAGDocument {
  id: number;
  content: string;
  metadata: Record<string, any>;
  created_at: string;
  similarity?: number;
}

export interface PromptTemplate {
  id: number;
  name: string;
  system_prompt: string;
  examples: Array<{ input: string; output: string }>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModelInfo {
  model_path: string;
  exists: boolean;
  size?: number;
}

export interface TrainingJob {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  dataset_path: string;
  base_model: string;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
  error_message?: string;
}