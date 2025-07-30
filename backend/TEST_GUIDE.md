# 백엔드 테스트 가이드

## 테스트 구조

### 테스트 파일 구성
```
backend/
├── chat/tests/
│   ├── __init__.py
│   ├── test_models.py          # Model 테스트
│   ├── test_views.py           # API 엔드포인트 테스트
│   ├── test_websocket.py       # WebSocket 테스트
│   ├── test_authentication.py  # 인증 테스트
│   └── test_integration.py     # 통합 테스트
├── llm/tests/
│   ├── __init__.py
│   ├── test_llm_service.py     # LLM 서비스 테스트
│   └── test_management_commands.py  # 관리 명령어 테스트
├── test_settings.py            # 테스트 전용 설정
├── pytest.ini                  # Pytest 설정
├── run_tests.sh               # 테스트 실행 스크립트 (Unix)
└── run_tests.bat              # 테스트 실행 스크립트 (Windows)
```

## 테스트 실행

### 전체 테스트 실행
```bash
# Unix/macOS/Linux
./run_tests.sh

# Windows
run_tests.bat

# 또는 직접 실행
python manage.py test --settings=test_settings
```

### 특정 테스트 실행
```bash
# 특정 앱 테스트
python manage.py test chat --settings=test_settings

# 특정 테스트 클래스
python manage.py test chat.tests.test_models.UserModelTest --settings=test_settings

# 특정 테스트 메서드
python manage.py test chat.tests.test_models.UserModelTest.test_create_user_without_password --settings=test_settings
```

### Pytest 사용 (선택사항)
```bash
# pytest 설치
pip install -r requirements-test.txt

# pytest 실행
pytest

# 특정 마커 실행
pytest -m "not slow"
pytest -m websocket
```

## 테스트 카테고리

### 1. Model 테스트 (`test_models.py`)
- User 모델: 비밀번호 없는 사용자 생성
- ChatSession: 세션 생성 및 설정 관리
- Message: 메시지 저장 및 정렬
- RAGDocument: 문서 저장 및 메타데이터
- PromptTemplate: 템플릿 및 예제 관리

### 2. API 테스트 (`test_views.py`)
- 인증 API: 로그인/로그아웃
- 세션 API: CRUD 작업
- RAG 문서 API: 문서 관리
- 프롬프트 템플릿 API: 템플릿 관리

### 3. WebSocket 테스트 (`test_websocket.py`)
- 연결 테스트: 인증된/인증되지 않은 연결
- 메시지 송수신: 실시간 채팅
- 설정 업데이트: 세션 설정 변경
- 에러 처리: 잘못된 메시지 처리

### 4. 인증 테스트 (`test_authentication.py`)
- 커스텀 인증 백엔드
- 사용자 생성 및 인증
- Django 통합

### 5. LLM 서비스 테스트 (`test_llm_service.py`)
- 모델 초기화 (모의 객체 사용)
- 스트리밍 생성
- 프롬프트 빌딩
- 임베딩 생성
- RAG 서비스

### 6. Management Command 테스트 (`test_management_commands.py`)
- `manage_prompts`: 프롬프트 템플릿 관리
- `manage_rag`: RAG 문서 관리
- Import/Export 기능

### 7. 통합 테스트 (`test_integration.py`)
- 전체 채팅 플로우
- RAG 통합
- 프롬프트 템플릿 통합
- 에러 처리

## 테스트 커버리지

### 커버리지 측정
```bash
# coverage 설치
pip install coverage

# 커버리지 실행
coverage run --source='.' manage.py test --settings=test_settings
coverage report
coverage html
```

### 커버리지 목표
- 전체 커버리지: 80% 이상
- 핵심 비즈니스 로직: 90% 이상
- API 엔드포인트: 95% 이상

## 모의 객체 사용

### LLM 모델 모의
```python
@patch('llm.llm_service.Llama')
def test_with_mock_llm(self, mock_llama):
    mock_llama.return_value = Mock()
    # 테스트 코드
```

### WebSocket 테스트
```python
communicator = WebsocketCommunicator(application, "/ws/chat/1/")
communicator.scope['user'] = user
connected, _ = await communicator.connect()
```

### 외부 API 모의
```python
@patch('requests.get')
def test_external_api(self, mock_get):
    mock_response = Mock()
    mock_response.text = 'Content'
    mock_get.return_value = mock_response
```

## 테스트 데이터

### Fixture 사용
```python
def setUp(self):
    self.user = User.objects.create_user(username='testuser')
    self.session = ChatSession.objects.create(user=self.user)
```

### Factory 패턴 (factory-boy)
```python
# 향후 구현 가능
class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User
    username = factory.Faker('user_name')
```

## 테스트 환경

### 테스트 설정 (`test_settings.py`)
- In-memory SQLite 데이터베이스
- In-memory Channel Layer
- 마이그레이션 비활성화
- 로깅 비활성화

### 환경 변수
테스트용 환경 변수가 자동으로 설정됩니다:
- `MODEL_PATH`: 'test_model.gguf'
- `MODEL_MAX_TOKENS`: '128'
- `MODEL_THREADS`: '2'

## 트러블슈팅

### 1. Import 에러
```bash
# PYTHONPATH 설정
export PYTHONPATH=$PYTHONPATH:/path/to/backend
```

### 2. 비동기 테스트 에러
```python
# TransactionTestCase 사용
class WebSocketTest(TransactionTestCase):
    # 테스트 코드
```

### 3. 테스트 DB 에러
```bash
# 테스트 DB 권한 확인
python manage.py test --keepdb --settings=test_settings
```

## CI/CD 통합

### GitHub Actions 예제
```yaml
- name: Run tests
  run: |
    cd backend
    pip install -r requirements-test.txt
    python manage.py test --settings=test_settings
```

### 테스트 병렬 실행
```bash
# 병렬 실행 (pytest)
pytest -n auto

# Django 병렬 실행
python manage.py test --parallel --settings=test_settings
```

## 베스트 프랙티스

1. **격리된 테스트**: 각 테스트는 독립적이어야 함
2. **명확한 이름**: 테스트 이름은 테스트 내용을 명확히 설명
3. **AAA 패턴**: Arrange-Act-Assert 패턴 사용
4. **모의 객체**: 외부 의존성은 모의 객체로 대체
5. **엣지 케이스**: 정상 케이스와 에러 케이스 모두 테스트
6. **성능**: 느린 테스트는 `@pytest.mark.slow` 마커 사용