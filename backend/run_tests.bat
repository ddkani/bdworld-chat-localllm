@echo off

:: Activate virtual environment
call venv\Scripts\activate.bat

echo === Running Django Tests ===

:: Run all tests
echo Running all tests...
python manage.py test --settings=test_settings

:: Run specific test categories
echo.
echo === Running Model Tests ===
python manage.py test chat.tests.test_models --settings=test_settings

echo.
echo === Running API Tests ===
python manage.py test chat.tests.test_views --settings=test_settings

echo.
echo === Running WebSocket Tests ===
python manage.py test chat.tests.test_websocket --settings=test_settings

echo.
echo === Running Authentication Tests ===
python manage.py test chat.tests.test_authentication --settings=test_settings

echo.
echo === Running LLM Service Tests ===
python manage.py test llm.tests.test_llm_service --settings=test_settings

echo.
echo === Running Management Command Tests ===
python manage.py test llm.tests.test_management_commands --settings=test_settings

:: Generate coverage report (optional)
where coverage >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo === Generating Coverage Report ===
    coverage run --source="." manage.py test --settings=test_settings
    coverage report
    coverage html
    echo Coverage report generated in htmlcov/
)

pause