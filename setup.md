# 프로젝트 설정 가이드

## 요구사항

### 시스템 요구사항
- Python 3.8 이상
- Node.js 16 이상
- Redis 서버 (WebSocket을 위한 Channel Layer)
- 8GB RAM (LLM 실행을 위한 최소 사양)
- 약 5GB의 디스크 공간 (모델 파일 저장용)

### 권장 사양
- CPU: 4코어 이상
- RAM: 16GB 이상
- 저장공간: SSD 권장

## Backend 설정

### 1. 가상환경 생성 및 활성화

```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 2. 의존성 설치

```bash
pip install -r requirements.txt
```

추가로 tabulate와 tqdm 설치 (management command용):
```bash
pip install tabulate tqdm
```

### 3. 환경 변수 설정

`.env` 파일이 이미 생성되어 있습니다. 필요시 수정하세요:

```env
SECRET_KEY=django-insecure-dev-key-change-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# LLM Configuration
MODEL_PATH=models/mistral-7b-instruct-v0.2.Q4_K_M.gguf
MODEL_MAX_TOKENS=512
MODEL_TEMPERATURE=0.7
MODEL_THREADS=4
MODEL_CONTEXT_LENGTH=4096

# Database
DATABASE_NAME=db.sqlite3

# Redis Configuration for Channels
REDIS_URL=redis://localhost:6379/0
```

### 4. LLM 모델 다운로드

```bash
python manage.py download_model --model mistral-7b-instruct-v0.2.Q4_K_M
```

다른 모델 옵션:
- `mistral-7b-instruct-v0.2.Q5_K_M` (더 높은 품질, 더 큰 크기)
- `mistral-7b-instruct-v0.2.Q3_K_S` (더 작은 크기, 낮은 품질)

### 5. 데이터베이스 마이그레이션

```bash
python manage.py makemigrations
python manage.py migrate
```

### 6. Redis 서버 시작

별도의 터미널에서:
```bash
# macOS (Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# 또는 직접 실행
redis-server
```

### 7. Django 서버 실행

```bash
python manage.py runserver
```

## Frontend 설정

### 1. 의존성 설치

```bash
cd frontend
npm install
```

### 2. 개발 서버 실행

```bash
npm start
```

프론트엔드는 http://localhost:3000 에서 실행됩니다.

## Django Management Commands

### 1. Prompt Template 관리

```bash
# 템플릿 목록 보기
python manage.py manage_prompts list

# 새 템플릿 추가
python manage.py manage_prompts add "customer_service" "You are a helpful customer service assistant." --description "Customer service bot template"

# 예제 대화 추가 (JSON 파일 사용)
python manage.py manage_prompts add "coding_assistant" "You are an expert programmer." --examples-file examples.json

# 템플릿 업데이트
python manage.py manage_prompts update "customer_service" --system-prompt "You are a friendly and helpful customer service representative."

# 템플릿 삭제
python manage.py manage_prompts delete "customer_service"

# 템플릿 내보내기
python manage.py manage_prompts export --output prompts_backup.json

# 템플릿 가져오기
python manage.py manage_prompts import prompts_backup.json
```

예제 JSON 파일 형식 (examples.json):
```json
[
  {
    "user": "How do I return an item?",
    "assistant": "I'd be happy to help you with the return process. Could you please provide your order number?"
  },
  {
    "user": "Order #12345",
    "assistant": "Thank you! I've found your order. You can initiate a return by visiting our returns portal at..."
  }
]
```

### 2. RAG 문서 관리

```bash
# 문서 목록 보기
python manage.py manage_rag list

# 문서 추가 (텍스트 직접 입력)
python manage.py manage_rag add --title "Python Guide" --content "Python is a high-level programming language..." --tags python programming

# 파일에서 문서 추가
python manage.py manage_rag add --title "Django Documentation" --file docs/django.txt --type upload

# URL에서 문서 추가
python manage.py manage_rag add --title "AI Article" --url https://example.com/article --type url

# 여러 문서 가져오기
python manage.py manage_rag import documents.json --format json
python manage.py manage_rag import data.csv --format csv
python manage.py manage_rag import manual.txt --format txt

# 문서 검색
python manage.py manage_rag search "How to use Django ORM" --limit 5

# 문서 삭제
python manage.py manage_rag delete 1

# 모든 문서 삭제
python manage.py manage_rag clear --confirm

# RAG 통계 보기
python manage.py manage_rag stats
```

문서 가져오기 형식:

**JSON 형식 (documents.json):**
```json
[
  {
    "title": "Document Title",
    "content": "Document content here...",
    "tags": ["tag1", "tag2"],
    "metadata": {"author": "John Doe", "date": "2024-01-01"}
  }
]
```

**CSV 형식 (data.csv):**
```csv
title,content,tags
"Python Basics","Python is a versatile language...","python,programming"
"Django Tutorial","Django is a web framework...","django,web"
```

### 3. 모델 관리

```bash
# 모델 다운로드
python manage.py download_model --model mistral-7b-instruct-v0.2.Q4_K_M --output-dir models

# 강제 재다운로드
python manage.py download_model --model mistral-7b-instruct-v0.2.Q4_K_M --force
```

## 프로덕션 배포 시 주의사항

1. **SECRET_KEY 변경**: `.env` 파일의 SECRET_KEY를 안전한 값으로 변경
2. **DEBUG 비활성화**: `DEBUG=False` 설정
3. **ALLOWED_HOSTS 설정**: 실제 도메인 추가
4. **HTTPS 설정**: 프로덕션에서는 반드시 HTTPS 사용
5. **데이터베이스**: SQLite 대신 PostgreSQL 등 프로덕션용 DB 사용 권장
6. **정적 파일 서빙**: Nginx 등을 통한 정적 파일 서빙
7. **프로세스 관리**: Gunicorn + Supervisor 또는 systemd 사용

## 문제 해결

### LLM 모델이 로드되지 않는 경우
1. 모델 파일이 올바른 경로에 있는지 확인
2. 파일 권한 확인
3. 메모리가 충분한지 확인

### WebSocket 연결이 실패하는 경우
1. Redis 서버가 실행 중인지 확인
2. CORS 설정 확인
3. 방화벽 설정 확인

### 성능이 느린 경우
1. 더 작은 quantization 모델 사용 (Q3_K_S)
2. `MODEL_MAX_TOKENS` 값 감소
3. `MODEL_THREADS` 값을 CPU 코어 수에 맞게 조정