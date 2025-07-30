#!/bin/bash

echo "=== macOS Setup Script for Local LLM Chat ==="

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Redis
echo "Installing Redis..."
brew install redis

# Start Redis service
echo "Starting Redis service..."
brew services start redis

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    echo "Python 3.8+ is required. Current version: $python_version"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

# Install uv if not already installed
if ! command -v uv &> /dev/null; then
    echo "Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    
    # Add to PATH for current session
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Verify uv installation
echo "uv version: $(uv --version)"

# Create virtual environment with uv
echo "Creating virtual environment with uv..."
uv venv

# Install dependencies
echo "Installing Python dependencies with uv..."

# Check if Apple Silicon
if [[ $(uname -m) == 'arm64' ]]; then
    echo "Detected Apple Silicon. Installing with Metal support..."
    CMAKE_ARGS="-DLLAMA_METAL=on" uv pip install llama-cpp-python --force-reinstall --no-cache-dir
    uv pip install -r requirements-macos.txt
else
    uv pip install -r requirements-macos.txt
fi

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env 2>/dev/null || cat > .env << EOL
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
uv run python manage.py makemigrations
uv run python manage.py migrate

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Download the LLM model:"
echo "   uv run python manage.py download_model"
echo ""
echo "2. Run the development server:"
echo "   uv run python manage.py runserver"
echo ""
echo "3. In a new terminal, ensure Redis is running:"
echo "   redis-cli ping"
echo ""
echo "Note: If you're on Apple Silicon (M1/M2), the Metal acceleration is enabled for better performance."