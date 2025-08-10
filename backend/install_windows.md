# Windows 설치 가이드

## 방법 1: Pre-built Wheel 사용 (권장)

pyproject.toml이 이미 수정되어 있으므로 다음 명령을 실행하세요:

```bash
cd backend
uv run python manage.py download_model
```

## 방법 2: 수동으로 Pre-built Wheel 설치

만약 위 방법이 작동하지 않으면:

```bash
# 1. Pre-built wheel 직접 설치
pip install https://github.com/abetlen/llama-cpp-python/releases/download/v0.3.2/llama_cpp_python-0.3.2-cp311-cp311-win_amd64.whl

# 2. 나머지 의존성 설치
uv pip install -e .

# 3. 모델 다운로드
uv run python manage.py download_model
```

## 방법 3: Visual Studio Build Tools 설치 (소스에서 빌드)

소스에서 직접 빌드하려면:

1. **Visual Studio Build Tools 2022 설치**
   - https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022 에서 다운로드
   - "Desktop development with C++" 워크로드 선택
   - 설치 완료 후 재부팅

2. **새 명령 프롬프트 열기** (환경 변수 적용을 위해)

3. **설치 재시도**
   ```bash
   cd backend
   uv run python manage.py download_model
   ```

## Python 버전별 Wheel URL

Python 버전이 3.11이 아닌 경우:

- Python 3.10: `https://github.com/abetlen/llama-cpp-python/releases/download/v0.3.2/llama_cpp_python-0.3.2-cp310-cp310-win_amd64.whl`
- Python 3.9: `https://github.com/abetlen/llama-cpp-python/releases/download/v0.3.2/llama_cpp_python-0.3.2-cp39-cp39-win_amd64.whl`

pyproject.toml의 해당 줄을 Python 버전에 맞게 수정하세요.

## 문제 해결

### CMAKE_C_COMPILER not set 오류
Visual Studio Build Tools가 설치되어 있지 않거나 PATH에 등록되지 않은 경우입니다. 방법 1 또는 2를 사용하세요.

### Python 버전 확인
```bash
python --version
```

### 32비트 Windows
32비트 Windows는 지원되지 않습니다. 64비트 시스템을 사용하세요.