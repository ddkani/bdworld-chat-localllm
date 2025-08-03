export interface User {
  id: number;
  username: string;
  created_at: string;
  last_login: string | null;
}

export interface ChatSession {
  id: number;
  user: User;
  title: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  settings: SessionSettings;
  message_count: number;
}

export interface SessionSettings {
  temperature: number;
  max_tokens: number;
  system_prompt: string | null;
  prompt_template: string;
}

export interface Message {
  id?: number;
  session?: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
  rag_context?: string | null;
}

export interface RAGDocument {
  id: number;
  title: string;
  content: string;
  source_type: 'upload' | 'text' | 'url';
  source_path: string | null;
  metadata: Record<string, any>;
  tags: string[];
  created_at: string;
  updated_at: string;
  added_by: User;
  is_active: boolean;
}

export interface PromptTemplate {
  id: number;
  name: string;
  description: string;
  system_prompt: string;
  examples: Array<{
    user: string;
    assistant: string;
  }>;
  created_at: string;
  updated_at: string;
  created_by: User;
  is_active: boolean;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}