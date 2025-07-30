#!/bin/bash

echo "=== Setting up LLM Chat Backend with uv ==="

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
echo "Creating virtual environment..."
uv venv

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
uv pip install -e .

# Install development dependencies
echo "Installing development dependencies..."
uv pip install -e ".[dev]"

# Platform-specific installations
PLATFORM=$(uname -s)
if [[ "$PLATFORM" == "Darwin" ]]; then
    echo "macOS detected. Installing with Metal support..."
    if [[ $(uname -m) == 'arm64' ]]; then
        CMAKE_ARGS="-DLLAMA_METAL=on" uv pip install --force-reinstall --no-cache-dir llama-cpp-python
    fi
elif [[ "$PLATFORM" == "Linux" ]]; then
    echo "Linux detected."
elif [[ "$PLATFORM" == "MINGW"* ]] || [[ "$PLATFORM" == "MSYS"* ]]; then
    echo "Windows detected. Make sure Visual Studio Build Tools are installed."
fi

# Install pre-commit hooks (if using)
if [ -f ".pre-commit-config.yaml" ]; then
    echo "Installing pre-commit hooks..."
    uv pip install pre-commit
    pre-commit install
fi

# Create .env file if not exists
if [ ! -f .env ]; then
    echo "Creating .env file..."
    cp .env.example .env || cat > .env << EOL
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
echo "To activate the environment in the future, run:"
echo "  source .venv/bin/activate"
echo ""
echo "Or use uv run to execute commands:"
echo "  uv run python manage.py runserver"
echo ""
echo "Next steps:"
echo "1. Download the LLM model:"
echo "   uv run python manage.py download_model"
echo ""
echo "2. Run the development server:"
echo "   uv run python manage.py runserver"
echo ""