const BRUSHES = [
  { b: 'y', label: '가능', key: '1', on: 'bg-yes text-white' },
  { b: 'm', label: '조율 가능', short: '조율', key: '2', on: 'bg-maybe text-[#2a2100]' },
  { b: 'n', label: '불가', key: '3', on: 'bg-ink2 text-sheet' },
  { b: '', label: '지우기', key: '0', on: 'bg-ink text-sheet' },
]

/**
 * 칠하기 도구. 고른 도구만 상태 색으로 채우고 나머지는 연한 회색 면이에요.
 * compact: 모바일 하단 바용 (짧은 이름, 단축키 숨김)
 */
export default function Palette({ brush, setBrush, compact = false, className = '' }) {
  return (
    <div className={`grid grid-cols-4 gap-1.5 ${className}`} role="group" aria-label="칠하기 도구">
      {BRUSHES.map(({ b, label, short, key, on }) => {
        const active = brush === b
        return (
          <button
            key={key}
            type="button"
            aria-pressed={active}
            aria-label={label}
            onClick={() => setBrush(b)}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-[12px] border-0 px-1.5 text-[13px] font-semibold ${
              active ? on : 'bg-rule2 text-ink2 hover:text-ink'
            } ${compact ? '' : 'sm:text-sm'}`}
          >
            <span className={`sw ${b || 'e'} !h-3.5 !w-3.5 ${active ? 'shadow-[0_0_0_2px_rgba(255,255,255,.85)]' : ''}`} />
            {short && compact ? short : short ? (
              <>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </>
            ) : (
              label
            )}
            {!compact && <kbd className="hidden font-mono text-[10px] font-medium opacity-55 sm:inline">{key}</kbd>}
          </button>
        )
      })}
    </div>
  )
}
