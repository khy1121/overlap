# Overlap

일주일 중 각자 되는 시간을 칠하면, 모두가 겹치는 회의 시간을 찾아 "이 시간 어때요?" 하고 제안하는 웹앱이에요.

- Google 로그인 (Supabase Auth)
- 가능 / 조율 가능 / 불가를 시간표에 칠하기, 요일·시간 줄 전체 칠하기, 키보드 입력
- 실시간 동기화 (Supabase Realtime)
- 전원 가능한 시간, 추천 시간, 회의 시간 확정
- 링크·이메일·함께했던 사람으로 초대
- Google 캘린더에서 바쁜 시간만 가져오기 (free/busy, 일정 제목·내용은 읽지 않음)

## 기술 스택

React 18 + Vite, Tailwind CSS 3 + SCSS, Supabase (Postgres, Auth, Realtime), Vercel

## 로컬 실행

```bash
cp .env.example .env.local
npm install
npm run dev
```

## 폴더 구조

```
src/
  components/   화면 컴포넌트 (Board = 회의 화면, TimeGrid = 시간표 등)
  hooks/        useMeeting (불러오기·실시간·저장), useToast
  lib/          supabase 클라이언트, 로그인, 시간 계산(schedule.js)
  styles/       Tailwind + SCSS (색 토큰, 시간표 무늬)
supabase/migrations/   DB 구조와 보안 규칙(RLS)
```

## 처음 한 번 해야 하는 설정

### 1. Google 로그인 켜기
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 OAuth 클라이언트 ID(웹 애플리케이션)를 만들어요.
   - 승인된 리디렉션 URI: `https://ytoqzmggkerwffipbhsu.supabase.co/auth/v1/callback`
2. 같은 프로젝트에서 **Google Calendar API**를 사용 설정해요 (캘린더 가져오기용).
3. OAuth 동의 화면에 범위 `.../auth/calendar.freebusy`를 추가하고, 테스트 중에는 테스트 사용자로 본인 계정을 등록해요.
4. Supabase 대시보드 → Authentication → Sign In / Providers → Google 에 클라이언트 ID와 보안 비밀을 넣고 켜요.

### 2. 배포 주소 등록
Supabase 대시보드 → Authentication → URL Configuration
- Site URL: Vercel 배포 주소 (예: `https://overlap-xxxx.vercel.app`)
- Redirect URLs: 같은 주소에 `/**`를 붙여 추가 (예: `https://overlap-xxxx.vercel.app/**`), 로컬 개발용 `http://localhost:5173/**`

### 3. Vercel 환경 변수
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (값은 `.env.example` 참고)
