#!/bin/bash

# Check if Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "Redis is not running. Starting Redis..."
    brew services start redis
    sleep 2
fi

# Check if model exists
if [ ! -f "models/mistral-7b-instruct-v0.2.Q4_K_M.gguf" ]; then
    echo "Model not found. Please run: uv run python manage.py download_model"
    exit 1
fi

# Run Django development server
echo "Starting Django development server with UV..."
uv run python manage.py runserver