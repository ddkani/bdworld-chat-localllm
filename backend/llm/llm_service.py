import os
import sys
import json
import asyncio
from typing import Optional, List, Dict, Any, AsyncGenerator
from pathlib import Path
from llama_cpp import Llama
from django.conf import settings
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import sqlite3
import logging
import platform

logger = logging.getLogger(__name__)

class LLMService:
    _instance = None
    _model = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(LLMService, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._model is None:
            self.initialize_model()
    
    def initialize_model(self):
        """Initialize the Mistral 7B model with llama-cpp-python"""
        model_path = os.getenv('MODEL_PATH', 'models/mistral-7b-instruct-v0.2.Q4_K_M.gguf')
        
        # Handle Windows path
        if platform.system() == 'Windows':
            model_path = model_path.replace('/', '\\')
        
        # Ensure model directory exists
        model_dir = Path(model_path).parent
        model_dir.mkdir(exist_ok=True)
        
        if not Path(model_path).exists():
            logger.warning(f"Model file not found at {model_path}. Please download the model first.")
            return
        
        # Platform-specific optimizations
        n_threads = int(os.getenv('MODEL_THREADS', 4))
        system = platform.system()
        
        kwargs = {
            'model_path': str(model_path),
            'n_ctx': int(os.getenv('MODEL_CONTEXT_LENGTH', 4096)),
            'n_threads': n_threads,
            'n_batch': 8,  # Smaller batch for faster streaming
            'n_gpu_layers': 0,  # CPU only
            'verbose': False
        }
        
        # macOS Metal optimization
        if system == 'Darwin' and platform.machine() == 'arm64':
            # Metal is automatically enabled if compiled with it
            logger.info("Detected Apple Silicon, Metal acceleration may be available")
        
        try:
            self._model = Llama(**kwargs)
            logger.info(f"LLM model loaded successfully on {system}")
        except Exception as e:
            logger.error(f"Failed to load LLM model: {e}")
            self._model = None
    
    async def generate_streaming(
        self, 
        prompt: str, 
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        system_prompt: Optional[str] = None,
        rag_context: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response from the model"""
        if self._model is None:
            yield "Error: Model not loaded. Please check model path."
            return
        
        max_tokens = max_tokens or int(os.getenv('MODEL_MAX_TOKENS', 512))
        temperature = temperature or float(os.getenv('MODEL_TEMPERATURE', 0.7))
        
        # Build the full prompt with system message and RAG context
        full_prompt = self._build_prompt(prompt, system_prompt, rag_context)
        
        try:
            # Run generation in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            
            # Create a queue for thread-safe token passing
            queue = asyncio.Queue()
            
            def generate():
                try:
                    stream = self._model(
                        full_prompt,
                        max_tokens=max_tokens,
                        temperature=temperature,
                        stream=True,
                        stop=["</s>", "[/INST]"],
                        echo=False
                    )
                    
                    for output in stream:
                        token = output['choices'][0]['text']
                        if token:
                            # Put token in queue synchronously
                            asyncio.run_coroutine_threadsafe(queue.put(token), loop)
                    
                    # Signal completion
                    asyncio.run_coroutine_threadsafe(queue.put(None), loop)
                except Exception as e:
                    asyncio.run_coroutine_threadsafe(queue.put(e), loop)
            
            # Start generation in thread
            loop.run_in_executor(None, generate)
            
            # Stream tokens from queue
            while True:
                item = await queue.get()
                if item is None:
                    break
                elif isinstance(item, Exception):
                    raise item
                else:
                    yield item
                    
        except Exception as e:
            logger.error(f"Error during generation: {e}")
            yield f"Error: {str(e)}"
    
    def _build_prompt(self, user_prompt: str, system_prompt: Optional[str] = None, rag_context: Optional[str] = None) -> str:
        """Build the full prompt with Mistral instruction format"""
        if system_prompt is None:
            system_prompt = "You are a helpful AI assistant."
        
        prompt_parts = [f"<s>[INST] {system_prompt}"]
        
        if rag_context:
            prompt_parts.append(f"\n\nContext information:\n{rag_context}")
        
        prompt_parts.append(f"\n\nUser: {user_prompt} [/INST]")
        
        return "".join(prompt_parts)
    
    def generate_embedding(self, text: str) -> np.ndarray:
        """Generate embeddings for text (simplified - in production use sentence-transformers)"""
        # For now, use a simple hash-based embedding
        # In production, use a proper embedding model
        words = text.lower().split()
        embedding = np.zeros(384)  # Standard embedding size
        
        for i, word in enumerate(words[:100]):  # Limit to first 100 words
            hash_val = hash(word) % 384
            embedding[hash_val] = 1.0 + (i * 0.01)
        
        # Normalize
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
            
        return embedding


class PromptTuningService:
    """Service for managing prompt templates and optimizations"""
    
    def __init__(self):
        self.templates_path = Path("llm/prompt_templates.json")
        self.templates = self._load_templates()
    
    def _load_templates(self) -> Dict[str, Any]:
        """Load prompt templates from file"""
        if self.templates_path.exists():
            with open(self.templates_path, 'r') as f:
                return json.load(f)
        return {
            "default": {
                "system": "You are a helpful AI assistant.",
                "examples": []
            }
        }
    
    def save_templates(self):
        """Save prompt templates to file"""
        self.templates_path.parent.mkdir(exist_ok=True)
        with open(self.templates_path, 'w') as f:
            json.dump(self.templates, f, indent=2)
    
    def add_template(self, name: str, system_prompt: str, examples: List[Dict[str, str]] = None):
        """Add a new prompt template"""
        self.templates[name] = {
            "system": system_prompt,
            "examples": examples or []
        }
        self.save_templates()
    
    def get_template(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a prompt template by name"""
        return self.templates.get(name)
    
    def update_template(self, name: str, system_prompt: Optional[str] = None, examples: Optional[List[Dict[str, str]]] = None):
        """Update an existing template"""
        if name in self.templates:
            if system_prompt is not None:
                self.templates[name]["system"] = system_prompt
            if examples is not None:
                self.templates[name]["examples"] = examples
            self.save_templates()
    
    def list_templates(self) -> List[str]:
        """List all available templates"""
        return list(self.templates.keys())


class RAGService:
    """Service for Retrieval-Augmented Generation using SQLite-VSS"""
    
    def __init__(self, db_path: str = "rag_vectors.db"):
        # Handle Windows path
        if platform.system() == 'Windows':
            db_path = db_path.replace('/', '\\')
        self.db_path = db_path
        self.llm_service = LLMService()
        self._init_db()
    
    def _init_db(self):
        """Initialize SQLite database with vector search capabilities"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create documents table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                metadata TEXT,
                embedding BLOB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def add_document(self, content: str, metadata: Optional[Dict[str, Any]] = None):
        """Add a document to the RAG database"""
        embedding = self.llm_service.generate_embedding(content)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO documents (content, metadata, embedding)
            VALUES (?, ?, ?)
        ''', (content, json.dumps(metadata or {}), embedding.tobytes()))
        
        conn.commit()
        conn.close()
    
    def search_similar(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """Search for similar documents using vector similarity"""
        query_embedding = self.llm_service.generate_embedding(query)
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('SELECT id, content, metadata, embedding FROM documents')
        results = []
        
        for row in cursor.fetchall():
            doc_id, content, metadata, embedding_bytes = row
            doc_embedding = np.frombuffer(embedding_bytes, dtype=np.float64)
            
            # Calculate cosine similarity
            similarity = cosine_similarity([query_embedding], [doc_embedding])[0][0]
            
            results.append({
                'id': doc_id,
                'content': content,
                'metadata': json.loads(metadata),
                'similarity': similarity
            })
        
        conn.close()
        
        # Sort by similarity and return top_k
        results.sort(key=lambda x: x['similarity'], reverse=True)
        return results[:top_k]
    
    def get_context(self, query: str, top_k: int = 3) -> str:
        """Get relevant context for a query"""
        similar_docs = self.search_similar(query, top_k)
        
        if not similar_docs:
            return ""
        
        context_parts = []
        for doc in similar_docs:
            context_parts.append(f"[Relevance: {doc['similarity']:.2f}]\n{doc['content']}")
        
        return "\n\n---\n\n".join(context_parts)