# Pytest 최적화 가이드

## 개요

기존 Django 테스트를 pytest로 최적화하여 다음과 같은 이점을 제공합니다:
- 더 간결하고 읽기 쉬운 테스트 코드
- 강력한 fixture 시스템
- 병렬 실행 지원
- 더 나은 테스트 출력 및 디버깅
- 플러그인 생태계

## 새로운 구조

```
backend/
├── conftest.py                    # 전역 pytest 설정 및 fixtures
├── pytest.ini                     # pytest 설정 파일
├── tox.ini                       # 다중 환경 테스트 설정
├── .coveragerc                   # 커버리지 설정
├── pytest_run.sh                 # pytest 실행 스크립트 (Unix)
├── pytest_run.bat                # pytest 실행 스크립트 (Windows)
├── chat/tests/
│   ├── test_models_pytest.py     # 최적화된 Model 테스트
│   ├── test_views_pytest.py      # 최적화된 API 테스트
│   ├── test_websocket_pytest.py  # 최적화된 WebSocket 테스트
│   └── (기존 테스트 파일들...)
└── llm/tests/
    ├── test_llm_service_pytest.py # 최적화된 LLM 서비스 테스트
    └── (기존 테스트 파일들...)
```

## 주요 개선사항

### 1. Fixture 시스템

**conftest.py**에 정의된 재사용 가능한 fixtures:

```python
# 사용자 fixtures
@pytest.fixture
def user(db):
    return User.objects.create_user(username='testuser')

# API 클라이언트 fixtures
@pytest.fixture
def authenticated_api_client(user, api_client):
    api_client.force_authenticate(user=user)
    return api_client

# WebSocket fixtures
@pytest.fixture
async def websocket_communicator(user):
    # WebSocket 테스트를 위한 communicator 생성
    ...
```

### 2. Parametrized 테스트

반복적인 테스트를 간결하게:

```python
@pytest.mark.parametrize("username,expected", [
    ("user123", "user123"),
    ("test_user", "test_user"),
    ("email@example.com", "email@example.com"),
])
def test_various_usernames(self, db, username, expected):
    user = User.objects.create_user(username=username)
    assert user.username == expected
```

### 3. 마커 시스템

테스트 분류 및 선택적 실행:

```python
@pytest.mark.unit          # 단위 테스트
@pytest.mark.integration   # 통합 테스트
@pytest.mark.slow         # 느린 테스트
@pytest.mark.websocket    # WebSocket 테스트
@pytest.mark.llm          # LLM 관련 테스트
```

### 4. Mock 최적화

pytest-mock을 사용한 간편한 mocking:

```python
def test_with_mock(self, mocker):
    mock_llama = mocker.patch('llm.llm_service.Llama')
    # 테스트 코드
```

## 실행 방법

### 빠른 실행

```bash
# Unix/macOS/Linux
./pytest_run.sh

# Windows
pytest_run.bat
```

### 기본 실행

```bash
# 모든 테스트 실행
pytest

# 특정 파일 실행
pytest chat/tests/test_models_pytest.py

# 특정 클래스 실행
pytest chat/tests/test_models_pytest.py::TestUserModel

# 특정 테스트 실행
pytest chat/tests/test_models_pytest.py::TestUserModel::test_create_user_without_password
```

### 마커별 실행

```bash
# 단위 테스트만
pytest -m unit

# 통합 테스트만
pytest -m integration

# WebSocket 테스트만
pytest -m websocket

# 느린 테스트 제외
pytest -m "not slow"

# 단위 테스트와 LLM 테스트
pytest -m "unit or llm"
```

### 커버리지

```bash
# 커버리지와 함께 실행
pytest --cov=chat --cov=llm

# HTML 리포트 생성
pytest --cov=chat --cov=llm --cov-report=html

# 특정 커버리지 임계값 설정
pytest --cov=chat --cov-fail-under=80
```

### 병렬 실행

```bash
# pytest-xdist 설치
pip install pytest-xdist

# CPU 코어 수만큼 병렬 실행
pytest -n auto

# 4개 프로세스로 실행
pytest -n 4
```

### 디버깅

```bash
# 실패 시 즉시 중단
pytest -x

# 첫 번째 실패에서 pdb 실행
pytest --pdb

# 자세한 출력
pytest -vv

# 짧은 트레이스백
pytest --tb=short

# 실패한 테스트만 재실행
pytest --lf
```

## Tox를 이용한 다중 환경 테스트

```bash
# tox 설치
pip install tox

# 모든 환경에서 테스트
tox

# 특정 환경에서만 테스트
tox -e py39-django42

# 커버리지 실행
tox -e coverage

# 코드 스타일 검사
tox -e lint

# 코드 포맷팅
tox -e format
```

## VS Code 통합

`.vscode/settings.json`:

```json
{
    "python.testing.pytestEnabled": true,
    "python.testing.unittestEnabled": false,
    "python.testing.pytestArgs": [
        "chat/tests",
        "llm/tests"
    ]
}
```

## 성능 비교

### Django TestCase vs Pytest

| 측면 | Django TestCase | Pytest |
|------|----------------|---------|
| 실행 속도 | 보통 | 빠름 (병렬 실행) |
| 코드 가독성 | 장황함 | 간결함 |
| Fixture 재사용 | 제한적 | 강력함 |
| 파라미터화 | 수동 | 자동 (`@parametrize`) |
| 디버깅 | 기본 | 고급 (`--pdb`, `-x`) |

### 실행 시간 예시

```bash
# Django TestCase (순차 실행)
python manage.py test  # ~45초

# Pytest (병렬 실행)
pytest -n auto  # ~15초
```

## 모범 사례

### 1. Fixture 사용

```python
# Bad
def test_something(self):
    user = User.objects.create_user('test')
    session = ChatSession.objects.create(user=user)
    # 테스트

# Good
def test_something(self, chat_session):
    # chat_session fixture 자동 생성
    # 테스트
```

### 2. 파라미터화 활용

```python
# Bad
def test_temp_05(self):
    assert calculate(0.5) == expected_05

def test_temp_07(self):
    assert calculate(0.7) == expected_07

# Good
@pytest.mark.parametrize("temp,expected", [
    (0.5, expected_05),
    (0.7, expected_07),
])
def test_temperatures(self, temp, expected):
    assert calculate(temp) == expected
```

### 3. 마커 활용

```python
@pytest.mark.slow
@pytest.mark.integration
def test_full_workflow(self):
    # 느린 통합 테스트
```

### 4. 명확한 assertion

```python
# Bad
assert result

# Good
assert result is not None
assert result.status_code == 200
assert 'expected' in result.data
```

## 트러블슈팅

### 1. 비동기 테스트 오류

```bash
# pytest-asyncio 설치 확인
pip install pytest-asyncio

# 테스트에 마커 추가
@pytest.mark.asyncio
async def test_async():
    ...
```

### 2. Django DB 접근 오류

```python
# 마커 추가 필요
@pytest.mark.django_db
def test_with_db():
    ...
```

### 3. Import 오류

```bash
# PYTHONPATH 설정
export PYTHONPATH=$PYTHONPATH:/path/to/backend
```

## 추가 플러그인

유용한 pytest 플러그인:

```bash
# 테스트 순서 무작위화
pip install pytest-random-order

# 테스트 벤치마크
pip install pytest-benchmark

# BDD 스타일 테스트
pip install pytest-bdd

# 테스트 타임아웃
pip install pytest-timeout

# Mock 자동 정리
pip install pytest-mock
```

## CI/CD 통합

### GitHub Actions

```yaml
- name: Run Pytest
  run: |
    pip install -r requirements-test.txt
    pytest --cov=chat --cov=llm --cov-report=xml
    
- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
```

### GitLab CI

```yaml
test:
  script:
    - pip install -r requirements-test.txt
    - pytest --cov=chat --cov=llm --junit-xml=report.xml
  artifacts:
    reports:
      junit: report.xml
```