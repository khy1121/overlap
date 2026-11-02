/** @type {import('tailwindcss').Config} */
const v = (name) => `var(--${name})`
const pretendard = ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', '"Apple SD Gothic Neo"', '"Malgun Gothic"', 'sans-serif']

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: v('paper'),
        sheet: v('sheet'),
        ink: v('ink'),
        ink2: v('ink-2'),
        rule: v('rule'),
        rule2: v('rule-2'),
        cell: v('cell'),
        weekend: v('weekend'),
        pen: v('pen'),
        'pen-strong': v('pen-strong'),
        'pen-ink': v('pen-ink'),
        'pen-soft': v('pen-soft'),
        pink: v('pink'),
        yes: v('yes'),
        maybe: v('maybe'),
        no: v('no'),
        'yes-soft': v('yes-soft'),
        'maybe-soft': v('maybe-soft'),
        'no-soft': v('no-soft'),
      },
      // 타이포는 전부 Pretendard. 기존 클래스(font-display, font-mono)는 그대로 두고 글꼴만 바꿔요.
      fontFamily: {
        display: pretendard,
        body: pretendard,
        mono: pretendard,
        sans: pretendard,
      },
      borderRadius: {
        sm: '8px',
        DEFAULT: '10px',
        md: '16px',
        lg: '24px',
      },
      boxShadow: {
        soft: v('shadow-soft'),
        float: v('shadow-float'),
      },
      transitionTimingFunction: { out: 'cubic-bezier(.23,1,.32,1)' },
    },
  },
  plugins: [],
}
