@echo off

echo === Running Pytest Tests with UV ===

:: Run tests with different configurations using uv

echo.
echo 1. Running all tests with coverage...
uv run pytest --cov=chat --cov=llm --cov-report=term-missing --cov-report=html

echo.
echo 2. Running unit tests only...
uv run pytest -m unit

echo.
echo 3. Running integration tests only...
uv run pytest -m integration

echo.
echo 4. Running WebSocket tests...
uv run pytest -m websocket

echo.
echo 5. Running LLM tests...
uv run pytest -m llm

echo.
echo 6. Running tests in parallel...
uv run pytest -n auto

echo.
echo 7. Running tests with verbose output...
uv run pytest -vv --tb=short

echo.
echo 8. Running specific test file...
uv run pytest chat\tests\test_models_pytest.py -v

echo.
echo === Test Summary ===
echo Coverage report available at: htmlcov\index.html
echo Run 'uv run pytest --help' for more options

pause