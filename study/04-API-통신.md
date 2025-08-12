# 🔗 API 통신 구조 이해하기

## 📌 API란?

**API (Application Programming Interface)**는 프로그램들이 서로 대화하는 방법입니다.
- 식당의 **메뉴판과 주문 시스템**과 같은 역할
- 손님(프론트엔드)이 주문(요청)하면 주방(백엔드)이 음식(응답)을 제공

## 🌐 HTTP 통신

### HTTP 메서드
| 메서드 | 용도 | 예시 |
|-------|------|------|
| **GET** | 데이터 조회 | 세션 목록 가져오기 |
| **POST** | 데이터 생성 | 새 세션 만들기 |
| **PUT/PATCH** | 데이터 수정 | 세션 이름 변경 |
| **DELETE** | 데이터 삭제 | 세션 삭제 |

### 요청과 응답 구조
```
[요청 Request]
GET /api/sessions/ HTTP/1.1
Host: localhost:8000
Authorization: Token abc123

[응답 Response]
HTTP/1.1 200 OK
Content-Type: application/json
{
  "sessions": [
    {"id": 1, "title": "첫 대화"}
  ]
}
```

## 📡 REST API 설계

### RESTful 원칙
1. **자원(Resource)**: URL로 표현
2. **행위(Verb)**: HTTP 메서드로 표현
3. **표현(Representation)**: JSON으로 전달

### API 엔드포인트 구조
```
기본 URL: http://localhost:8000/api

/auth/login/          POST    로그인
/auth/logout/         POST    로그아웃
/auth/user/           GET     현재 사용자 정보

/sessions/            GET     세션 목록
/sessions/            POST    새 세션 생성
/sessions/{id}/       GET     특정 세션 조회
/sessions/{id}/       PATCH   세션 수정
/sessions/{id}/       DELETE  세션 삭제

/llm/prompts/         GET     프롬프트 목록
/llm/prompts/         POST    프롬프트 생성
/llm/prompts/{id}/    PATCH   프롬프트 수정

/rag/documents/       GET     문서 목록
/rag/documents/       POST    문서 추가
/rag/search/          POST    유사도 검색
```

## 💻 프론트엔드 API 호출

### 1. Axios를 사용한 API 호출
```typescript
import axios from 'axios';

// API 인스턴스 생성
const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  }
});

// 인터셉터 - 모든 요청에 토큰 추가
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  }
);
```

### 2. API 서비스 함수들
```typescript
// 로그인
export const login = async (username: string) => {
  try {
    const response = await api.post('/auth/login/', { 
      username 
    });
    
    // 토큰 저장
    localStorage.setItem('token', response.data.token);
    return response.data;
  } catch (error) {
    console.error('로그인 실패:', error);
    throw error;
  }
};

// 세션 목록 가져오기
export const getSessions = async () => {
  const response = await api.get('/sessions/');
  return response.data;
};

// 새 세션 생성
export const createSession = async (title: string) => {
  const response = await api.post('/sessions/', { 
    title 
  });
  return response.data;
};

// 세션 삭제
export const deleteSession = async (id: string) => {
  await api.delete(`/sessions/${id}/`);
};
```

### 3. React 컴포넌트에서 사용
```typescript
function SessionList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // 세션 목록 불러오기
  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      try {
        const data = await getSessions();
        setSessions(data);
      } catch (err) {
        setError('세션을 불러올 수 없습니다');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, []);
  
  // 새 세션 만들기
  const handleCreateSession = async () => {
    try {
      const newSession = await createSession('새 대화');
      setSessions([...sessions, newSession]);
    } catch (err) {
      alert('세션 생성 실패');
    }
  };
  
  if (loading) return <div>로딩 중...</div>;
  if (error) return <div>{error}</div>;
  
  return (
    <div>
      {sessions.map(session => (
        <SessionItem key={session.id} {...session} />
      ))}
      <button onClick={handleCreateSession}>
        새 세션 만들기
      </button>
    </div>
  );
}
```

## 🔙 백엔드 API 처리

### 1. Django REST Framework 뷰
```python
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

class SessionViewSet(viewsets.ModelViewSet):
    queryset = ChatSession.objects.all()
    serializer_class = SessionSerializer
    
    def list(self, request):
        """세션 목록 조회"""
        sessions = self.queryset.filter(
            user=request.user.username
        )
        serializer = self.serializer_class(
            sessions, many=True
        )
        return Response(serializer.data)
    
    def create(self, request):
        """새 세션 생성"""
        serializer = self.serializer_class(
            data=request.data
        )
        if serializer.is_valid():
            serializer.save(user=request.user.username)
            return Response(
                serializer.data, 
                status=201
            )
        return Response(
            serializer.errors, 
            status=400
        )
    
    @action(detail=True, methods=['post'])
    def clear_messages(self, request, pk=None):
        """세션 메시지 지우기"""
        session = self.get_object()
        session.messages.all().delete()
        return Response({'status': 'messages cleared'})
```

### 2. Serializer (데이터 변환)
```python
from rest_framework import serializers

class SessionSerializer(serializers.ModelSerializer):
    message_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatSession
        fields = ['id', 'title', 'created_at', 
                 'message_count']
    
    def get_message_count(self, obj):
        return obj.messages.count()

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'content', 'is_user', 
                 'timestamp']
```

### 3. URL 라우팅
```python
# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('sessions', SessionViewSet)
router.register('messages', MessageViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/auth/', include('chat.auth_urls')),
]
```

## 🔒 인증과 권한

### 토큰 인증
```python
# 백엔드 - 토큰 생성
from rest_framework.authtoken.models import Token

def login(request):
    username = request.data.get('username')
    # 간단한 인증 (실제로는 더 복잡함)
    user, created = User.objects.get_or_create(
        username=username
    )
    token, created = Token.objects.get_or_create(
        user=user
    )
    return Response({'token': token.key})
```

### 프론트엔드 인증 관리
```typescript
// AuthContext.tsx
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(
    localStorage.getItem('token')
  );
  
  const login = async (username: string) => {
    const response = await api.post('/auth/login/', {
      username
    });
    
    setToken(response.data.token);
    setUser(response.data.user);
    localStorage.setItem('token', response.data.token);
  };
  
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };
  
  return (
    <AuthContext.Provider value={{ 
      user, token, login, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## 📊 상태 코드

| 코드 | 의미 | 설명 |
|------|------|------|
| **200** | OK | 요청 성공 |
| **201** | Created | 생성 성공 |
| **400** | Bad Request | 잘못된 요청 |
| **401** | Unauthorized | 인증 필요 |
| **403** | Forbidden | 권한 없음 |
| **404** | Not Found | 찾을 수 없음 |
| **500** | Server Error | 서버 오류 |

## 🔄 에러 처리

### 프론트엔드 에러 처리
```typescript
// 전역 에러 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 - 로그인 페이지로
      window.location.href = '/login';
    } else if (error.response?.status === 500) {
      alert('서버 오류가 발생했습니다');
    }
    return Promise.reject(error);
  }
);

// 컴포넌트 레벨 에러 처리
const [error, setError] = useState<string | null>(null);

try {
  const data = await api.get('/sessions/');
  setSessions(data);
} catch (err: any) {
  setError(err.response?.data?.message || 
           '알 수 없는 오류');
}
```

### 백엔드 에러 처리
```python
from rest_framework.exceptions import ValidationError

class SessionViewSet(viewsets.ModelViewSet):
    def create(self, request):
        try:
            # 검증
            if not request.data.get('title'):
                raise ValidationError('제목이 필요합니다')
            
            # 세션 생성
            session = ChatSession.objects.create(
                title=request.data['title'],
                user=request.user.username
            )
            
            return Response(
                SessionSerializer(session).data,
                status=201
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=400
            )
        except Exception as e:
            return Response(
                {'error': '서버 오류'},
                status=500
            )
```

## 🚦 API 테스트

### Postman 사용
```
1. Postman 설치
2. 새 요청 생성
3. URL 입력: http://localhost:8000/api/sessions/
4. Headers 추가: Authorization: Token {your_token}
5. Send 클릭
```

### cURL 명령어
```bash
# 로그인
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser"}'

# 세션 목록
curl http://localhost:8000/api/sessions/ \
  -H "Authorization: Token abc123"

# 새 세션 생성
curl -X POST http://localhost:8000/api/sessions/ \
  -H "Authorization: Token abc123" \
  -H "Content-Type: application/json" \
  -d '{"title": "새 대화"}'
```

## 📚 학습 자료

### REST API
- [REST API 제대로 알고 사용하기](https://meetup.nhncloud.com/posts/92)
- [RESTful API 설계 가이드](https://sanghaklee.tistory.com/57)

### HTTP 통신
- [MDN - HTTP 개요](https://developer.mozilla.org/ko/docs/Web/HTTP/Overview)
- [HTTP 상태 코드](https://developer.mozilla.org/ko/docs/Web/HTTP/Status)

### API 테스트
- [Postman 튜토리얼](https://learning.postman.com/docs/getting-started/introduction/)
- [Thunder Client (VS Code 확장)](https://www.thunderclient.com/)

### Django REST Framework
- [DRF 공식 문서](https://www.django-rest-framework.org/)
- [DRF 튜토리얼 한국어](https://raccoonyy.github.io/drf3-tutorial-1/)

## 💡 실습 아이디어

1. **새 API 엔드포인트 추가**
   - 메시지 검색 API
   - 통계 API (총 메시지 수 등)
   - 즐겨찾기 기능

2. **API 최적화**
   - 페이지네이션 구현
   - 필터링 기능
   - 캐싱 적용

3. **보안 강화**
   - JWT 토큰 구현
   - Rate Limiting
   - CORS 설정

## 🤔 생각해볼 문제

1. REST API와 GraphQL의 차이는?
2. API 버전 관리는 어떻게 할까?
3. API 문서화는 왜 중요할까?

---

다음 문서: [05-실시간-채팅.md](./05-실시간-채팅.md) 에서 WebSocket을 이용한 실시간 통신을 알아봐요!