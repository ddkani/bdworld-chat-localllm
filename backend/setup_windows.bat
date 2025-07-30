@echo off
echo === Windows Setup Script for Local LLM Chat ===

:: Check Python version
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.8 or higher from https://www.python.org/
    pause
    exit /b 1
)

:: Check if uv is installed
where uv >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing uv...
    powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
    
    :: Refresh PATH
    call refreshenv
)

:: Verify uv installation
echo uv version:
uv --version

:: Create virtual environment with uv
echo Creating virtual environment with uv...
uv venv

:: Install dependencies
echo Installing Python dependencies with uv...
uv pip install -r requirements-windows.txt

:: Create .env file if not exists
if not exist .env (
    echo Creating .env file...
    (
        echo SECRET_KEY=django-insecure-dev-key-change-in-production
        echo DEBUG=True
        echo ALLOWED_HOSTS=localhost,127.0.0.1
        echo.
        echo # LLM Configuration
        echo MODEL_PATH=models\mistral-7b-instruct-v0.2.Q4_K_M.gguf
        echo MODEL_MAX_TOKENS=512
        echo MODEL_TEMPERATURE=0.7
        echo MODEL_THREADS=4
        echo MODEL_CONTEXT_LENGTH=4096
        echo.
        echo # Database
        echo DATABASE_NAME=db.sqlite3
        echo.
        echo # Redis Configuration for Channels
        echo REDIS_URL=redis://localhost:6379/0
    ) > .env
)

:: Create models directory
if not exist models mkdir models

:: Run migrations
echo Running database migrations...
uv run python manage.py makemigrations
uv run python manage.py migrate

echo.
echo === Setup Almost Complete! ===
echo.
echo IMPORTANT: Redis setup required
echo.
echo Option 1 - Use WSL2 (Recommended):
echo   1. Install WSL2: wsl --install
echo   2. In WSL2 terminal: sudo apt-get install redis-server
echo   3. Start Redis: sudo service redis-server start
echo.
echo Option 2 - Native Windows Redis:
echo   1. Download from: https://github.com/microsoftarchive/redis/releases
echo   2. Extract and run redis-server.exe
echo.
echo Option 3 - Use Memurai (Redis alternative):
echo   1. Download from: https://www.memurai.com/
echo   2. Install and run Memurai service
echo.
echo After Redis is running:
echo 1. Download the LLM model:
echo    uv run python manage.py download_model
echo.
echo 2. Run the development server:
echo    uv run python manage.py runserver
echo.
echo Note: If you get build errors, install Visual Studio Build Tools:
echo https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
pause