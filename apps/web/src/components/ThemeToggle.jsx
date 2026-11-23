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
  const choose = (key) => { setTheme(key); setState(key) }
  const i = OPTIONS.findIndex(([k]) => k === theme)
  const [, curLabel, curIcon] = OPTIONS[i]
  const [nextKey, nextLabel] = OPTIONS[(i + 1) % OPTIONS.length]
  return (
    <>
      {/* 모바일: 아이콘 하나, 누를 때마다 시스템 → 라이트 → 다크 */}
      <button
        type="button"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-0 bg-rule text-accent sm:hidden"
        aria-label={`화면 테마: ${curLabel}. 누르면 ${nextLabel}`}
        title={curLabel}
        onClick={() => choose(nextKey)}
      >
        {curIcon}
      </button>
      {/* 태블릿 이상: 세 개를 나란히 */}
      <div className="inline-flex shrink-0 gap-0.5 rounded-full bg-rule p-[3px] max-sm:hidden" role="radiogroup" aria-label="화면 테마">
        {OPTIONS.map(([key, label, svg]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={theme === key}
            aria-label={label}
            title={label}
            className={`grid h-8 w-8 place-items-center rounded-full border-0 ${theme === key ? 'bg-sheet text-accent shadow-soft' : 'bg-transparent text-ink2 hover:text-ink'}`}
            onClick={() => choose(key)}
          >
            {svg}
          </button>
        ))}
      </div>
    </>
  )
}
