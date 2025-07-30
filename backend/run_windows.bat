@echo off

:: Check if model exists
if not exist "models\mistral-7b-instruct-v0.2.Q4_K_M.gguf" (
    echo Model not found. Please run: uv run python manage.py download_model
    pause
    exit /b 1
)

:: Check Redis (basic check)
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo WARNING: Redis does not appear to be running!
    echo Please ensure Redis/Memurai is running before starting the server.
    echo.
    pause
)

:: Run Django development server
echo Starting Django development server with UV...
uv run python manage.py runserver