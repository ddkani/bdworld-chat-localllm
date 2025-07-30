#!/bin/bash

echo "=== Running Pytest Tests with UV ==="

# Run tests with different configurations using uv

echo -e "\n1. Running all tests with coverage..."
uv run pytest --cov=chat --cov=llm --cov-report=term-missing --cov-report=html

echo -e "\n2. Running unit tests only..."
uv run pytest -m unit

echo -e "\n3. Running integration tests only..."
uv run pytest -m integration

echo -e "\n4. Running WebSocket tests..."
uv run pytest -m websocket

echo -e "\n5. Running LLM tests..."
uv run pytest -m llm

echo -e "\n6. Running tests in parallel..."
uv run pytest -n auto

echo -e "\n7. Running tests with verbose output..."
uv run pytest -vv --tb=short

echo -e "\n8. Running specific test file..."
uv run pytest chat/tests/test_models_pytest.py -v

echo -e "\n=== Test Summary ==="
echo "Coverage report available at: htmlcov/index.html"
echo "Run 'uv run pytest --help' for more options"