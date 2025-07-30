#!/bin/bash

echo "=== Linux Setup Script for Local LLM Chat ==="

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "Cannot detect Linux distribution"
    exit 1
fi

# Install system dependencies based on distribution
if [[ "$OS" == "Ubuntu" ]] || [[ "$OS" == "Debian"* ]]; then
    echo "Detected Debian-based system: $OS $VER"
    echo "Installing system dependencies..."
    
    sudo apt-get update
    sudo apt-get install -y \
        python3-pip \
        python3-dev \
        python3-venv \
        build-essential \
        redis-server \
        git \
        curl \
        wget

elif [[ "$OS" == "Fedora"* ]] || [[ "$OS" == "CentOS"* ]] || [[ "$OS" == "Red Hat"* ]]; then
    echo "Detected Red Hat-based system: $OS $VER"
    echo "Installing system dependencies..."
    
    sudo dnf install -y \
        python3-pip \
        python3-devel \
        gcc \
        gcc-c++ \
        make \
        redis \
        git \
        wget

elif [[ "$OS" == "Arch Linux"* ]]; then
    echo "Detected Arch Linux"
    echo "Installing system dependencies..."
    
    sudo pacman -Sy --noconfirm \
        python-pip \
        base-devel \
        redis \
        git \
        wget

else
    echo "Unsupported distribution: $OS"
    echo "Please install the following manually:"
    echo "- Python 3.8+"
    echo "- pip"
    echo "- build tools (gcc, make)"
    echo "- Redis"
    exit 1
fi

# Start and enable Redis
echo "Starting Redis service..."
sudo systemctl start redis
sudo systemctl enable redis

# Check Redis status
if systemctl is-active --quiet redis; then
    echo "Redis is running"
else
    echo "Failed to start Redis. Please check the service status."
fi

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
uv pip install -r requirements-linux.txt

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

# Set execute permissions for manage.py
chmod +x manage.py

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
echo "3. Check Redis status:"
echo "   systemctl status redis"
echo ""
echo "Note: If you encounter permission issues, you may need to add your user to the redis group:"
echo "   sudo usermod -a -G redis $USER"