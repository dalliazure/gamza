# 🥔 감자 (Gamza) — 포근한 우리 동네 중고장터

**감자(Gamza)**는 이웃과 따뜻하게 물건을 나누고 거래할 수 있는 지역 기반 중고 거래 웹 서비스입니다.  
별도의 빌드 과정 없이 정적 웹 서버나 GitHub Pages, Vercel, Netlify 등에 즉시 배포할 수 있도록 순수 HTML5, CSS3, Vanilla JavaScript와 **Supabase(Auth & PostgreSQL)** 기반으로 제작되었습니다.

---

## ✨ 주요 기능

1. **상품 탐색 및 필터링**
   - 상품명, 동네 이름, 카테고리 실시간 키워드 검색
   - 7개 카테고리(`전체`, `디지털기기`, `가구/인테리어`, `생활가전`, `의류/잡화`, `취미/게임`, `도서/티켓/기타`) 필터
   - **`거래 가능만 보기`** 토글 필터 (체크 시 `거래 완료` 및 `예약중` 상품을 제외하고 `판매중` 상품만 노출)
   - 상품 상태별 배지(`판매중`, `예약중`, `거래 완료`) 및 **거래 완료 상품 흐림(Dimmed) 효과**

2. **회원가입 및 로그인 (Supabase Auth)**
   - 이메일·비밀번호 기반 회원가입(닉네임 필수 입력) 및 로그인 모달
   - 로그인 상태에 따른 상단 헤더 UI 자동 전환 (`[로그인]` ↔ `[닉네임] + [로그아웃]`)
   - 비로그인 상태에서 `[＋ 글쓰기]` 클릭 시 로그인 모달 선행 노출 후 글쓰기 화면으로 자동 이동

3. **상품 등록 및 작성자 전용 관리 (CRUD)**
   - 감자 마켓 전용 커스텀 SVG 일러스트 프리셋 6종 및 직접 이미지 업로드 지원
   - **작성자 본인 게시글 클릭 시 전용 컨트롤 제공**:
     - 상태 즉시 변경 버튼: `[판매중]` / `[예약중]` / `[거래 완료]` (Supabase 실시간 반영)
     - 게시글 `[✏️ 수정]` 및 `[🗑️ 삭제]` 기능

4. **관심 상품(찜하기) 연동**
   - 상세 모달에서 관심 상품 추가/해제 시 Supabase `wishes` 테이블과 실시간 동기화

---

## 🗂️ 프로젝트 구조

```text
gamza/
├── index.html       # 메인 레이아웃 (목록 화면, 글쓰기/수정 화면, 상세 모달, 로그인/회원가입 모달)
├── styles.css       # 감자 테마 디자인 시스템, 반응형 그리드, 상태 배지 및 거래 완료 흐림 스타일
├── app.js           # Supabase Auth/DB 연동, 상태 관리, 필터링 및 UI 이벤트 로직
├── .env.example     # 환경 변수 예시 파일
└── .gitignore       # 민감 정보(.env) 및 임시 파일 제외 설정
```

---

## 🗄️ 데이터베이스 구조 (Supabase PostgreSQL)

개인 식별 정보(이메일, 전화번호, 실명)를 공개 테이블에 직접 노출하지 않도록 분리 설계되어 있습니다.

| 테이블명 | 설명 | 주요 컬럼 |
| :--- | :--- | :--- |
| `public.profiles` | 회원 공개 프로필 (`auth.users` 연동) | `id (UUID, PK)`, `nickname`, `avatar_url`, `region`, `manner_temp`, `created_at` |
| `public.products` | 중고 거래 게시글 | `id (UUID, PK)`, `title`, `category`, `price`, `description`, `location`, `status`, `image_url`, `seller_id`, `seller_nickname`, `created_at` |
| `public.wishes` | 관심 상품(찜) 기록 | `id (UUID, PK)`, `user_id`, `product_id`, `created_at` |

---

## 🚀 로컬 실행 방법

정적 파일로 구성되어 있어 아무 로컬 웹 서버로도 바로 실행할 수 있습니다.

```bash
# Python 내장 서버 실행 예시
python -m http.server 3000
```

브라우저에서 `http://localhost:3000`으로 접속합니다.
