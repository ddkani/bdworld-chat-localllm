# LLM Chat & Management System

로컬 LLM을 활용한 채팅 시스템과 관리 도구입니다.

## 프로젝트 구조

```
.
├── backend/               # Django 백엔드 서버
├── frontend-chat/         # 채팅 UI (React)
└── frontend-admin/        # 관리자 UI (React)
```

## 주요 기능

### 채팅 시스템 (frontend-chat)
- 사용자 인증 (로그인/로그아웃)
- 채팅 세션 관리
- 실시간 스트리밍 응답
- RAG (Retrieval-Augmented Generation) 지원

### 관리자 시스템 (frontend-admin)
- **RAG 문서 관리**: 문서 추가, 삭제, 유사도 검색
- **프롬프트 템플릿**: 시스템 프롬프트 및 Few-shot 예제 관리
- **모델 관리**: LLM 모델 다운로드 및 관리
- **Fine-tuning**: 커스텀 데이터셋으로 모델 학습

## 설치 및 실행

### 1. 백엔드 설정

```bash
cd backend
./setup_macos.sh  # macOS
# 또는
./setup_windows.bat  # Windows
# 또는
./setup_linux.sh  # Linux

# 데이터베이스 마이그레이션
uv run python manage.py makemigrations
uv run python manage.py migrate

# 서버 실행
./run_macos.sh  # macOS
# 또는
./run_windows.bat  # Windows
# 또는
./run_linux.sh  # Linux
```

### 2. 채팅 UI 실행

```bash
cd frontend-chat
npm install
npm start  # http://localhost:3001
```

### 3. 관리자 UI 실행

```bash
cd frontend-admin
npm install
npm start  # http://localhost:3002
```

## API 엔드포인트

### 인증 API
- `POST /api/auth/login/` - 로그인
- `POST /api/auth/logout/` - 로그아웃
- `GET /api/auth/user/` - 현재 사용자 정보

### 채팅 API
- `GET /api/sessions/` - 세션 목록
- `POST /api/sessions/` - 새 세션 생성
- `PATCH /api/sessions/{id}/` - 세션 수정
- `DELETE /api/sessions/{id}/` - 세션 삭제

### WebSocket
- `ws://localhost:8000/ws/chat/{session_id}/` - 채팅 WebSocket

### RAG API
- `GET /api/rag/documents/` - 문서 목록
- `POST /api/rag/documents/` - 문서 추가
- `DELETE /api/rag/documents/{id}/` - 문서 삭제
- `POST /api/rag/search/` - 유사도 검색

### 프롬프트 템플릿 API
- `GET /api/prompts/` - 템플릿 목록
- `POST /api/prompts/` - 템플릿 생성
- `PATCH /api/prompts/{id}/` - 템플릿 수정
- `DELETE /api/prompts/{id}/` - 템플릿 삭제
- `POST /api/prompts/{id}/activate/` - 템플릿 활성화

### 모델 관리 API
- `GET /api/models/info/` - 모델 정보
- `POST /api/models/download/` - 모델 다운로드 시작
- `GET /api/models/download/{task_id}/` - 다운로드 진행 상황

### Fine-tuning API
- `GET /api/finetuning/jobs/` - 학습 작업 목록
- `POST /api/finetuning/jobs/` - 새 학습 작업
- `GET /api/finetuning/jobs/{id}/` - 작업 상세 정보
- `POST /api/finetuning/jobs/{id}/cancel/` - 작업 취소
- `POST /api/finetuning/datasets/` - 데이터셋 업로드

## 환경 변수

### Backend (.env)
```
MODEL_PATH=models/mistral-7b-instruct-v0.2.Q4_K_M.gguf
MODEL_CONTEXT_LENGTH=4096
MODEL_MAX_TOKENS=512
MODEL_TEMPERATURE=0.7
MODEL_THREADS=4
```

### Frontend 환경 변수
```
REACT_APP_API_BASE_URL=http://localhost:8000/api
REACT_APP_WS_BASE_URL=ws://localhost:8000/ws
```

## 기술 스택

- **Backend**: Django, Django REST Framework, Django Channels, llama-cpp-python
- **Frontend**: React, TypeScript, Material-UI
- **Database**: SQLite
- **LLM**: Mistral 7B Instruct v0.2 (Quantized)

## 보안 고려사항

1. **인증**: 간단한 사용자명 기반 인증 (프로덕션에서는 강화 필요)
2. **CORS**: 프론트엔드 도메인만 허용
3. **WebSocket**: AllowedHostsOriginValidator 사용
4. **세션 격리**: 사용자별 세션 접근 제한

## 확장 가능성

1. **다른 LLM 모델 지원**: Llama 2, Phi-2 등
2. **고급 RAG**: Sentence Transformers를 이용한 더 나은 임베딩
3. **파인튜닝**: LoRA/QLoRA 지원 추가
4. **멀티모달**: 이미지 입력 지원
5. **플러그인 시스템**: 외부 도구 통합

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.