# Overlap

일주일 중 각자 되는 시간을 칠하면, 모두가 겹치는 회의 시간을 찾아 "이 시간 어때요?" 하고 제안하는 웹앱이에요.

- 이름 + 생년월일 + 비밀번호로 가입·로그인 (Supabase Auth + Edge Function)
- 계정마다 초대 코드 발급, 코드로 친구 맺기, 친구를 회의에 바로 초대
- 가능 / 조율 가능 / 불가를 시간표에 칠하기, 요일·시간 줄 전체 칠하기, 키보드 입력
- 실시간 동기화 (Supabase Realtime)
- 전원 가능한 시간, 추천 시간, 회의 시간 확정
- 링크·이메일·친구로 회의 초대
- Google 캘린더에서 바쁜 시간만 가져오기 (선택 기능, free/busy만 읽어서 일정 제목·내용은 받지 않음)

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
supabase/functions/    signup 가입 함수 (Edge Function)
```

## 가입 방식

이메일 없이 이름·생년월일·비밀번호로 가입해요.

- 이름과 생년월일로 내부 로그인 식별자를 만들어요. 식별자는 `SHA-256(이름|생년월일)`로 만든 가짜 이메일이에요.
  - 같은 규칙이 `supabase/functions/signup/index.ts`와 `src/lib/identity.js` 두 곳에 있어요. 한쪽을 바꾸면 다른 쪽도 같이 바꿔야 해요.
- 가입은 `signup` Edge Function이 서비스 키로 인증이 끝난 계정을 바로 만들어요. 그래서 이메일 인증 설정이 필요 없어요.
- 생년월일은 저장하지 않아요. 이름은 프로필에 저장해요.
- 이름과 생년월일이 같은 계정은 하나만 만들 수 있어요.
- 비밀번호를 잊으면 스스로 되찾을 수 없어요. 관리자가 Supabase 대시보드 Authentication 메뉴에서 해당 사용자의 비밀번호를 바꿔 줘야 해요.

## 배포 설정

### Vercel 환경 변수
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`: 필수예요. 값은 `.env.example`을 참고해요.
- `VITE_GOOGLE_CLIENT_ID`: 선택이에요. 넣으면 "Google 캘린더에서 바쁜 시간 가져오기" 버튼이 보여요.

### (선택) Google 캘린더 가져오기 켜기
1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)에서 **Google Calendar API**를 사용 설정해요.
2. OAuth 동의 화면에 범위 `https://www.googleapis.com/auth/calendar.freebusy`를 추가해요. 테스트 중에는 테스트 사용자를 등록해요.
3. OAuth 클라이언트 ID(웹 애플리케이션)를 만들고, 승인된 JavaScript 원본에 배포 주소를 넣어요. 예: `https://overlap-xxxx.vercel.app`
4. 만든 클라이언트 ID를 Vercel 환경 변수 `VITE_GOOGLE_CLIENT_ID`에 넣고 다시 배포해요.
