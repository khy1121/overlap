// 테마 선택: 'system'(기본) | 'light' | 'dark'. 선택은 이 브라우저에만 기억해요.
// 첫 페인트 전 적용은 index.html의 인라인 스크립트가 같은 키로 해요.
const KEY = 'overlap-theme'
const COLORS = { light: '#f2f4f6', dark: '#17171c' }

export function getTheme() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function setTheme(theme) {
  const root = document.documentElement
  if (theme === 'light' || theme === 'dark') root.dataset.theme = theme
  else delete root.dataset.theme
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // 저장이 막힌 브라우저에서는 이번 방문 동안만 적용돼요.
  }
  // 모바일 브라우저 상단 바 색도 맞춰요. 시스템이면 media 조건대로 원래 값으로.
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
    const forMedia = m.media.includes('dark') ? 'dark' : 'light'
    m.content = COLORS[theme === 'system' ? forMedia : theme]
  })
}
