#!/bin/bash
# This script is for running inside WSL2 on Windows

echo "=== WSL2 Setup Script for Local LLM Chat ==="

# Update package list
echo "Updating package list..."
sudo apt-get update

# Install dependencies
echo "Installing system dependencies..."
sudo apt-get install -y \
    python3-pip \
    python3-dev \
    python3-venv \
    build-essential \
    redis-server \
    git \
    curl \
    wget

# Start Redis
echo "Starting Redis service..."
sudo service redis-server start

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "Python 3.8+ is required. Current version: $python_version"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements-linux.txt

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cat > .env << EOL
SECRET_KEY=django-insecure-dev-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# LLM Configuration
MODEL_PATH=models/mistral-7b-instruct-v0.2.Q4_K_M.gguf
MODEL_MAX_TOKENS=512
MODEL_TEMPERATURE=0.7
MODEL_THREADS=4
MODEL_CONTEXT_LENGTH=4096

# Database
DATABASE_NAME=db.sqlite3

# Redis Configuration for Channels
REDIS_URL=redis://localhost:6379/0
EOL
fi

# Create models directory
mkdir -p models

# Run migrations
echo "Running database migrations..."
python manage.py makemigrations
python manage.py migrate

echo ""
echo "=== WSL2 Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Download the LLM model:"
echo "   python manage.py download_model"
echo ""
echo "2. Run the development server:"
echo "   python manage.py runserver 0.0.0.0:8000"
echo ""
echo "3. Access from Windows browser:"
echo "   http://localhost:8000"
echo ""
echo "Note: Make sure Redis is running:"
echo "   sudo service redis-server status"