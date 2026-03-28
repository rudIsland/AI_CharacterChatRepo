# AI Character Chat Backend MVP

## 구조

백엔드는 `api -> services -> repositories -> domain/entities` 흐름으로 나눴습니다.
모델 교체 가능성은 `providers/model_provider.py`의 인터페이스와 provider 선택 함수로 모았습니다.
그래서 지금은 Ollama 중심으로 실행하고, Gemini는 같은 자리에서 자연스럽게 추가할 수 있습니다.

## 1차 MVP 기능

1. 캐릭터 생성 및 조회
2. 대화방 생성 및 메시지 조회
3. `/chat` API로 사용자 메시지 저장과 모델 응답 저장
4. SQLite 기본 실행, `DATABASE_URL` 변경만으로 PostgreSQL 전환
5. Swagger 문서(`/docs`)로 기본 테스트 가능

## 디렉터리

```text
WorkSpace/Server
├─ app
│  ├─ api
│  ├─ domain
│  │  └─ entities
│  ├─ services
│  ├─ repositories
│  ├─ providers
│  └─ schemas
├─ tests
├─ .env.example
├─ requirements.txt
└─ requirements-postgres.txt
```

## 실행

```bash
cd WorkSpace/Server
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

PostgreSQL까지 바로 붙일 때만 추가로 설치합니다.

```bash
pip install -r requirements-postgres.txt
```

## 환경 변수

```env
DATABASE_URL=sqlite:///./app.db
OLLAMA_BASE_URL=http://localhost:11434
DEFAULT_MODEL_PROVIDER=ollama
DEFAULT_MODEL_NAME=llama3.1
GEMINI_API_KEY=
```

현재 Python 3.15 alpha 환경에서는 `psycopg` 설치가 막힐 수 있으므로, 기본 검증은 SQLite 기준으로 진행하는 편이 안전합니다.
