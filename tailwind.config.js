/** @type {import('tailwindcss').Config} */
const v = (name) => `var(--${name})`

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
        'pen-ink': v('pen-ink'),
        yes: v('yes'),
        maybe: v('maybe'),
        no: v('no'),
        'yes-soft': v('yes-soft'),
        'maybe-soft': v('maybe-soft'),
        'no-soft': v('no-soft'),
      },
      fontFamily: {
        display: ['"Gothic A1"', '"Apple SD Gothic Neo"', '"Malgun Gothic"', 'sans-serif'],
        body: ['"IBM Plex Sans KR"', '"Apple SD Gothic Neo"', '"Malgun Gothic"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'monospace'],
        hand: ['"Nanum Pen Script"', 'cursive'],
      },
      transitionTimingFunction: { out: 'cubic-bezier(.23,1,.32,1)' },
    },
  },
  plugins: [],
}
