@echo off
echo === Setting up LLM Chat Backend with uv ===

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
echo Creating virtual environment...
uv venv

:: Activate virtual environment
echo Activating virtual environment...
call .venv\Scripts\activate.bat

:: Install dependencies
echo Installing dependencies...
uv pip install -e .

:: Install development dependencies
echo Installing development dependencies...
uv pip install -e ".[dev]"

:: Windows specific note
echo.
echo Note: Make sure Visual Studio Build Tools are installed for compiling llama-cpp-python

:: Install pre-commit hooks (if using)
if exist ".pre-commit-config.yaml" (
    echo Installing pre-commit hooks...
    uv pip install pre-commit
    pre-commit install
)

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
echo === Setup Complete! ===
echo.
echo To activate the environment in the future, run:
echo   .venv\Scripts\activate.bat
echo.
echo Or use uv run to execute commands:
echo   uv run python manage.py runserver
echo.
echo Next steps:
echo 1. Download the LLM model:
echo    uv run python manage.py download_model
echo.
echo 2. Run the development server:
echo    uv run python manage.py runserver
echo.
pause