#!/bin/bash

# Activate virtual environment
source venv/bin/activate

echo "=== Running Django Tests ==="

# Run all tests
echo "Running all tests..."
python manage.py test --settings=test_settings

# Run specific test categories
echo -e "\n=== Running Model Tests ==="
python manage.py test chat.tests.test_models --settings=test_settings

echo -e "\n=== Running API Tests ==="
python manage.py test chat.tests.test_views --settings=test_settings

echo -e "\n=== Running WebSocket Tests ==="
python manage.py test chat.tests.test_websocket --settings=test_settings

echo -e "\n=== Running Authentication Tests ==="
python manage.py test chat.tests.test_authentication --settings=test_settings

echo -e "\n=== Running LLM Service Tests ==="
python manage.py test llm.tests.test_llm_service --settings=test_settings

echo -e "\n=== Running Management Command Tests ==="
python manage.py test llm.tests.test_management_commands --settings=test_settings

# Generate coverage report (optional)
if command -v coverage &> /dev/null; then
    echo -e "\n=== Generating Coverage Report ==="
    coverage run --source='.' manage.py test --settings=test_settings
    coverage report
    coverage html
    echo "Coverage report generated in htmlcov/"
fi