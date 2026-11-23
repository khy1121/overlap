/** @type {import('tailwindcss').Config} */
import plugin from 'tailwindcss/plugin'
import { brand, colors, cssVars, ease, fontFamily, radius } from '@overlap/core/tokens'

// 색 값은 @overlap/core/tokens 한 곳에. 여기서는 그 이름으로 CSS 변수를 가리키기만 해요(라이트/다크 전환).
const v = (name) => `var(--${name})`
// Tailwind 클래스 이름: 'ink-2' → ink2, 'rule-2' → rule2 (예전 이름 그대로), 나머지는 같은 이름
const twName = (k) => ({ 'ink-2': 'ink2', 'rule-2': 'rule2' }[k] || k)

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ...Object.fromEntries(Object.keys(colors.light).map((k) => [twName(k), v(k)])),
        ...brand, // bg-kakao, hover:bg-kakao-hover
      },
      // 타이포는 전부 Pretendard. 기존 클래스(font-display, font-mono)는 그대로 두고 글꼴만 바꿔요.
      fontFamily: { display: fontFamily, body: fontFamily, mono: fontFamily, sans: fontFamily },
      borderRadius: Object.fromEntries(Object.entries(radius).map(([k, px]) => [k, `${px}px`])),
      boxShadow: { soft: v('shadow-soft'), float: v('shadow-float') },
      transitionTimingFunction: { out: ease.replace(/\s/g, '') },
    },
  },
  plugins: [
    // CSS 변수 만들기: 기본은 라이트, 시스템이 다크면(사용자가 라이트를 고르지 않았을 때) 다크,
    // <html data-theme="dark">를 고르면 다크. (예전 _tokens.scss와 같은 규칙)
    plugin(({ addBase }) => {
      addBase({
        ':root': { ...cssVars('light'), '--ease': ease },
        '@media (prefers-color-scheme: dark)': { ":root:not([data-theme='light'])": cssVars('dark') },
        ":root[data-theme='dark']": cssVars('dark'),
      })
    }),
  ],
}
