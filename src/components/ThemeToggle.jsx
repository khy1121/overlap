import { useState } from 'react'
import { getTheme, setTheme } from '../lib/theme'

const icon = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }

const OPTIONS = [
  ['system', '시스템 설정 따르기', (
    <svg {...icon}><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></svg>
  )],
  ['light', '라이트 모드', (
    <svg {...icon}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
  )],
  ['dark', '다크 모드', (
    <svg {...icon}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
  )],
]

export default function ThemeToggle() {
  const [theme, setState] = useState(getTheme)
  return (
    <div className="inline-flex gap-0.5 rounded-full bg-rule2 p-[3px]" role="radiogroup" aria-label="화면 테마">
      {OPTIONS.map(([key, label, svg]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={theme === key}
          aria-label={label}
          title={label}
          className={`grid h-8 w-8 place-items-center rounded-full border-0 ${theme === key ? 'bg-sheet text-pen shadow-soft' : 'bg-transparent text-ink2 hover:text-ink'}`}
          onClick={() => { setTheme(key); setState(key) }}
        >
          {svg}
        </button>
      ))}
    </div>
  )
}
