// Overlap 디자인 토큰: 색·그림자·모서리·글꼴의 값은 여기 한 곳에만 둬요.
// 웹은 Tailwind 플러그인이 이 값으로 CSS 변수(--paper 등)를 만들고, 앱(NativeWind)도 같은 값을 써요.
//
// 팔레트: 토스 디자인 시스템 톤 (회색 배경 · 평평한 흰 카드 · 토스 블루 · 회색 글자 체계)
// pen: 포인트 블루. pen-strong: 흰 글자가 올라가는 버튼 배경(흰 글자 대비 5.4:1).
// accent: 파란 글자(링크·강조). 라이트는 #1b64da, 다크는 배경 위에서 잘 보이게 #4593fc.
// 상태색(yes/maybe/no)은 시간표 의미색. '불가'는 빨간색 대신 회색 칸(off) + X 표시(off-mark).

export const colors = {
  light: {
    paper: '#f2f4f6', sheet: '#ffffff', ink: '#191f28', 'ink-2': '#6b7684',
    rule: '#e5e8eb', 'rule-2': '#f2f4f6', cell: '#f2f4f6', weekend: '#e9ecef',
    pen: '#3182f6', 'pen-strong': '#1b64da', accent: '#1b64da', 'pen-ink': '#ffffff', 'pen-soft': '#e8f3ff', pink: '#ff8fb1',
    yes: '#3ccb9a', maybe: '#ffc94d', no: '#ff7a6b',
    'yes-soft': '#d6f5ea', 'maybe-soft': '#fff1cc', 'no-soft': '#ffe1dc',
    off: '#d1d6db', 'off-mark': '#8b95a1',
  },
  dark: {
    paper: '#17171c', sheet: '#202027', ink: '#f2f2f4', 'ink-2': '#9e9ea4',
    rule: '#2c2c35', 'rule-2': '#2a2a32', cell: '#2a2a32', weekend: '#24242b',
    pen: '#4593fc', 'pen-strong': '#1b64da', accent: '#4593fc', 'pen-ink': '#ffffff', 'pen-soft': '#1c2a45', pink: '#ff9dbb',
    yes: '#4fd8a8', maybe: '#ffd36b', no: '#ff8e81',
    'yes-soft': '#173a30', 'maybe-soft': '#3d3317', 'no-soft': '#41231f',
    off: '#3a3a45', 'off-mark': '#6f6f7a',
  },
}

/** 그림자: 토스처럼 아주 옅게 (다크는 조금 진하게) */
export const shadows = {
  light: { soft: '0 1px 3px rgba(0, 29, 58, .04)', float: '0 8px 24px rgba(0, 29, 58, .08)' },
  dark: { soft: '0 1px 3px rgba(0, 0, 0, .3)', float: '0 8px 24px rgba(0, 0, 0, .4)' },
}

/** 모서리 (px) */
export const radius = { sm: 8, DEFAULT: 10, md: 16, lg: 20 }

/** 글꼴: 전부 Pretendard */
export const fontFamily = ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', '"Apple SD Gothic Neo"', '"Malgun Gothic"', 'sans-serif']

/** 움직임 곡선 */
export const ease = 'cubic-bezier(.23, 1, .32, 1)'

/** 바깥 브랜드 색 (카카오 디자인 가이드) */
export const brand = { kakao: '#FEE500', 'kakao-hover': '#F5DC00' }

/** 브라우저 주소창·상태바 색 (앱 배경과 같게) */
export const themeColor = { light: colors.light.paper, dark: colors.dark.paper }

/** 한 모드의 CSS 변수 묶음: { '--paper': '#f2f4f6', ..., '--shadow-soft': ..., 'color-scheme': 'light' } */
export function cssVars(mode) {
  const out = {}
  for (const [k, v] of Object.entries(colors[mode])) out[`--${k}`] = v
  out['--shadow-soft'] = shadows[mode].soft
  out['--shadow-float'] = shadows[mode].float
  out['color-scheme'] = mode
  return out
}
