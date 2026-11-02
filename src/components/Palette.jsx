const BRUSHES = [
  { b: 'y', label: '가능', key: '1', on: 'bg-yes border-yes text-white' },
  { b: 'm', label: '조율 가능', short: '조율', key: '2', on: 'bg-maybe border-maybe text-[#2a2100]' },
  { b: 'n', label: '불가', key: '3', on: 'bg-no border-no text-white' },
  { b: '', label: '지우기', key: '0', on: 'border-ink shadow-[inset_0_0_0_1px_var(--ink)]' },
]

export default function Palette({ brush, setBrush }) {
  return (
    <div
      className="sticky z-[5] mb-1 grid grid-cols-4 gap-1.5 bg-sheet py-2"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
      role="group"
      aria-label="칠하기 도구"
    >
      {BRUSHES.map(({ b, label, short, key, on }) => {
        const active = brush === b
        return (
          <button
            key={key}
            aria-pressed={active}
            onClick={() => setBrush(b)}
            className={`flex min-h-[46px] items-center justify-center gap-1.5 rounded-lg border-2 px-1.5 text-[13px] font-semibold sm:gap-[7px] sm:text-sm ${
              active ? on : 'border-rule bg-sheet hover:border-ink2'
            }`}
          >
            <span className={`sw ${b || 'e'} !h-4 !w-4 ${active && b ? 'shadow-[0_0_0_2px_rgba(255,255,255,.8)]' : ''}`} />
            {short ? (
              <>
                <span className="sm:hidden">{short}</span>
                <span className="hidden sm:inline">{label}</span>
              </>
            ) : (
              label
            )}
            <kbd className="hidden font-mono text-[10px] font-medium opacity-55 sm:inline">{key}</kbd>
          </button>
        )
      })}
    </div>
  )
}
