# 플랫폼별 설치 가이드

## macOS

### 요구사항
- macOS 10.15 (Catalina) 이상
- Homebrew 설치
- Python 3.8 이상

### 빠른 설치
```bash
cd backend
chmod +x setup_macos.sh
./setup_macos.sh
```

### 수동 설치
1. Redis 설치:
   ```bash
   brew install redis
   brew services start redis
   ```

2. Python 가상환경 생성:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. 의존성 설치:
   ```bash
   pip install -r requirements-macos.txt
   ```

4. Apple Silicon (M1/M2) 최적화:
   ```bash
   CMAKE_ARGS="-DLLAMA_METAL=on" pip install llama-cpp-python --force-reinstall --no-cache-dir
   ```

### 실행
```bash
./run_macos.sh
# 또는
source venv/bin/activate
python manage.py runserver
```

## Linux (Ubuntu/Debian)

### 요구사항
- Ubuntu 20.04 이상 또는 Debian 10 이상
- Python 3.8 이상
- sudo 권한

### 빠른 설치
```bash
cd backend
chmod +x setup_linux.sh
./setup_linux.sh
```

### 수동 설치
1. 시스템 패키지 설치:
   ```bash
   sudo apt-get update
   sudo apt-get install -y python3-pip python3-dev python3-venv build-essential redis-server
   ```

2. Redis 시작:
   ```bash
   sudo systemctl start redis
   sudo systemctl enable redis
   ```

3. Python 가상환경 생성:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

4. 의존성 설치:
   ```bash
   pip install -r requirements-linux.txt
   ```

### 실행
```bash
./run_linux.sh
# 또는
source venv/bin/activate
python manage.py runserver
```

## Windows 10/11

### 요구사항
- Windows 10 버전 1903 이상 또는 Windows 11
- Python 3.8 이상
- Visual Studio Build Tools (C++ 컴파일러)

### 옵션 1: Native Windows

1. **Visual Studio Build Tools 설치**:
   - https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
   - "Desktop development with C++" 워크로드 선택

2. **Redis 설치**:
   - 옵션 A: [Redis for Windows](https://github.com/microsoftarchive/redis/releases) 다운로드
   - 옵션 B: [Memurai](https://www.memurai.com/) 설치 (Redis 대체)

3. **빠른 설치**:
   ```cmd
   cd backend
   setup_windows.bat
   ```

4. **실행**:
   ```cmd
   run_windows.bat
   ```

### 옵션 2: WSL2 사용 (권장)

1. **WSL2 설치**:
   ```powershell
   wsl --install
   ```

2. **Ubuntu 설치 후 WSL2 터미널에서**:
   ```bash
   cd /mnt/c/path/to/backend
   chmod +x setup_windows_wsl.sh
   ./setup_windows_wsl.sh
   ```

3. **실행**:
   ```bash
   source venv/bin/activate
   python manage.py runserver 0.0.0.0:8000
   ```

4. **Windows 브라우저에서 접속**:
   ```
   http://localhost:8000
   ```

## 공통 문제 해결

### Redis 연결 오류
- **macOS**: `brew services restart redis`
- **Linux**: `sudo systemctl restart redis`
- **Windows**: Redis/Memurai 서비스 재시작

### llama-cpp-python 설치 오류
- **모든 플랫폼**: 
  ```bash
  pip install --upgrade pip wheel setuptools
  pip install llama-cpp-python --no-cache-dir
  ```

### 권한 오류
- **Linux/macOS**: 
  ```bash
  chmod +x manage.py
  chmod -R 755 .
  ```

### 메모리 부족
- `.env` 파일에서 `MODEL_MAX_TOKENS`를 256으로 줄이기
- 더 작은 모델 사용: `Q3_K_S` 버전

## 플랫폼별 특징

### macOS
- Metal 가속 지원 (M1/M2)
- Homebrew를 통한 쉬운 패키지 관리
- 개발 환경에 최적화

### Linux
- 가장 안정적인 성능
- systemd를 통한 서비스 관리
- 프로덕션 환경 권장

### Windows
- WSL2 사용 시 Linux와 동일한 성능
- Native 실행 시 일부 제약 사항
- 개발 시 WSL2 권장

## 성능 팁

1. **CPU 코어 활용**:
   `.env`에서 `MODEL_THREADS`를 CPU 코어 수에 맞게 설정

2. **메모리 최적화**:
   - 8GB RAM: Q3_K_S 모델 사용
   - 16GB RAM: Q4_K_M 모델 사용
   - 32GB RAM: Q5_K_M 모델 사용

3. **플랫폼별 최적화**:
   - macOS: Metal 가속 활성화
   - Linux: 커널 파라미터 튜닝
   - Windows: WSL2 메모리 할당 조정