"""
Test settings for the chat project
"""
from chat_project.settings import *
import os

# Override settings for testing
import tempfile

# Use a temporary file for SQLite to avoid locking issues with async tests
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(tempfile.gettempdir(), 'test_db.sqlite3'),
        'OPTIONS': {
            'timeout': 20,
        },
        'TEST': {
            'NAME': os.path.join(tempfile.gettempdir(), 'test_db_test.sqlite3'),
        }
    }
}

# Use in-memory channel layer for tests
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer'
    }
}

# Disable migrations for faster tests
class DisableMigrations:
    def __contains__(self, item):
        return True

    def __getitem__(self, item):
        return None

MIGRATION_MODULES = DisableMigrations()

# Use test environment variables
os.environ['MODEL_PATH'] = 'test_model.gguf'
os.environ['MODEL_MAX_TOKENS'] = '128'
os.environ['MODEL_TEMPERATURE'] = '0.7'
os.environ['MODEL_THREADS'] = '2'

# Disable logging during tests
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'null': {
            'class': 'logging.NullHandler',
        },
    },
    'root': {
        'handlers': ['null'],
    },
    'loggers': {
        'django': {
            'handlers': ['null'],
            'propagate': False,
        },
        'channels': {
            'handlers': ['null'],
            'propagate': False,
        },
        'llm': {
            'handlers': ['null'],
            'propagate': False,
        },
    }
}

# Speed up password hashing for tests
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]