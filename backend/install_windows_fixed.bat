@echo off
echo Windows llama-cpp-python 설치 스크립트
echo =====================================

REM Python 버전 확인
python --version

echo.
echo 1단계: 기존 llama-cpp-python 제거 (있을 경우)
pip uninstall -y llama-cpp-python

echo.
echo 2단계: Pre-built wheel 설치 (Python 3.11용)
pip install https://github.com/abetlen/llama-cpp-python/releases/download/v0.3.2/llama_cpp_python-0.3.2-cp311-cp311-win_amd64.whl

echo.
echo 3단계: 나머지 의존성 설치
cd /d "%~dp0"
pip install -e .

echo.
echo 4단계: 모델 다운로드 시작
python manage.py download_model

echo.
echo 설치 완료!
pause