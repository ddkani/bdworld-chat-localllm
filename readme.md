# Local LLM Chat Project

웹 기반의 로컬 LLM을 이용한 채팅 애플리케이션입니다. Mistral 7B 모델을 사용하여 8GB RAM 환경에서도 실행 가능하도록 최적화되었습니다.

## 주요 기능

- 🔐 **간단한 사용자 인증**: 비밀번호 없이 사용자명만으로 로그인
- 💬 **실시간 채팅**: WebSocket을 통한 실시간 스트리밍 응답
- 📁 **세션 관리**: 여러 채팅 세션 생성, 저장, 삭제 가능
- 🧠 **RAG (Retrieval-Augmented Generation)**: 문서 기반 컨텍스트 검색
- 🎯 **Prompt Tuning**: 커스텀 프롬프트 템플릿 관리
- ⚡ **최적화된 성능**: 제한된 하드웨어에서도 초당 5-10 토큰 생성

## 기술 스택

### Backend
- **Django 4.2**: 웹 프레임워크
- **Django Channels**: WebSocket 지원
- **llama-cpp-python**: LLM 추론 엔진
- **SQLite + SQLite-VSS**: 데이터베이스 및 벡터 검색
- **Redis**: Channel Layer를 위한 메시지 브로커

### Frontend
- **React 18**: UI 프레임워크
- **TypeScript**: 타입 안정성
- **Material-UI**: UI 컴포넌트
- **WebSocket**: 실시간 통신

### LLM
- **Mistral 7B Instruct v0.2**: 기본 언어 모델
- **4-bit Quantization (Q4_K_M)**: 메모리 효율적인 모델

## 프로젝트 구조

```
.
├── backend/
│   ├── chat_project/       # Django 프로젝트 설정
│   ├── chat/              # 채팅 앱 (모델, 뷰, WebSocket)
│   ├── llm/               # LLM 서비스 및 관리
│   ├── requirements.txt   # Python 의존성
│   └── .env              # 환경 변수
├── frontend/
│   ├── src/
│   │   ├── components/   # React 컴포넌트
│   │   ├── contexts/     # React Context (인증)
│   │   ├── pages/        # 페이지 컴포넌트
│   │   ├── services/     # API 및 WebSocket 서비스
│   │   └── types/        # TypeScript 타입 정의
│   └── package.json      # Node.js 의존성
├── setup.md              # 설치 가이드
├── readme.md            # 프로젝트 문서
└── performance.md       # 성능 분석
```

## API 설계

### REST API Endpoints

#### 인증
- `POST /api/auth/login/` - 사용자 로그인
- `POST /api/auth/logout/` - 로그아웃
- `GET /api/auth/user/` - 현재 사용자 정보

#### 채팅 세션
- `GET /api/sessions/` - 세션 목록 조회
- `POST /api/sessions/` - 새 세션 생성
- `GET /api/sessions/{id}/` - 세션 상세 정보
- `PUT /api/sessions/{id}/` - 세션 업데이트
- `DELETE /api/sessions/{id}/` - 세션 삭제
- `GET /api/sessions/{id}/messages/` - 세션 메시지 조회

#### RAG 문서
- `GET /api/rag/documents/` - 문서 목록
- `POST /api/rag/documents/` - 문서 추가
- `GET /api/rag/documents/{id}/` - 문서 상세
- `PUT /api/rag/documents/{id}/` - 문서 수정
- `DELETE /api/rag/documents/{id}/` - 문서 삭제

#### 프롬프트 템플릿
- `GET /api/prompts/templates/` - 템플릿 목록
- `POST /api/prompts/templates/` - 템플릿 생성
- `GET /api/prompts/templates/{id}/` - 템플릿 상세
- `PUT /api/prompts/templates/{id}/` - 템플릿 수정
- `DELETE /api/prompts/templates/{id}/` - 템플릿 삭제

### WebSocket Protocol

연결: `ws://localhost:8000/ws/chat/{session_id}/`

#### 클라이언트 → 서버 메시지
```json
{
  "type": "message",
  "content": "사용자 메시지",
  "use_rag": true
}
```

#### 서버 → 클라이언트 메시지

**세션 정보:**
```json
{
  "type": "session_info",
  "session": {
    "id": "1",
    "title": "New Chat",
    "settings": {...}
  }
}
```

**스트리밍 시작:**
```json
{
  "type": "stream_start",
  "message": {
    "role": "assistant"
  }
}
```

**스트리밍 토큰:**
```json
{
  "type": "stream_token",
  "token": "생성된 "
}
```

**스트리밍 종료:**
```json
{
  "type": "stream_end",
  "message": {
    "id": 1,
    "role": "assistant",
    "content": "전체 응답 내용",
    "created_at": "2024-01-01T00:00:00Z",
    "rag_context": "사용된 컨텍스트"
  }
}
```

## 데이터베이스 스키마

### User
- 커스텀 사용자 모델 (비밀번호 없음)
- 사용자명으로만 인증

### ChatSession
- 사용자별 채팅 세션 관리
- 세션별 설정 저장 (temperature, max_tokens 등)

### Message
- 세션 내 개별 메시지
- role: user, assistant, system
- RAG 컨텍스트 추적

### RAGDocument
- RAG용 문서 저장
- 벡터 임베딩 및 유사도 검색

### PromptTemplate
- 재사용 가능한 프롬프트 템플릿
- Few-shot 예제 포함 가능

## 주요 특징

### 1. 메모리 효율적인 LLM 실행
- 4-bit quantization으로 모델 크기 축소
- CPU 전용 실행으로 GPU 불필요
- 스트리밍 응답으로 메모리 사용 최적화

### 2. 실시간 스트리밍
- WebSocket을 통한 토큰별 스트리밍
- 사용자 경험 향상
- 응답 대기 시간 단축

### 3. RAG 시스템
- 문서 기반 컨텍스트 검색
- 간단한 벡터 유사도 검색
- JSON, CSV, TXT 파일 지원

### 4. Prompt Tuning
- 시스템 프롬프트 커스터마이징
- Few-shot 학습 예제 관리
- 템플릿 import/export 기능

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

이 프로젝트는 교육 및 연구 목적으로 제공됩니다. Mistral 7B 모델 사용 시 해당 라이선스를 확인하세요.