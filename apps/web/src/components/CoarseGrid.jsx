import { dayLabel, nDays, rowFrom, rowTo } from '@overlap/core/schedule'
import { DEFAULT_BOUNDS, keysOf, partsOf } from '@overlap/core/parts'

// 약속 화면이 쓰던 이름 그대로 (원래 여기 있던 계산은 core로 옮겼어요)
export { DEFAULT_BOUNDS, keysOf, partsOf }

/** 칸 묶음의 상태: 모두 같으면 그 값(y/m/n), 하나도 없으면 u, 섞였으면 mix */
function stateOf(cells, keys) {
  if (!keys.length) return 'x'
  const vals = new Set(keys.map((k) => cells[k] || 'u'))
  return vals.size === 1 ? [...vals][0] : 'mix'
}

// 누를 때마다: (빈칸·일부) → 가능 → 안 돼요 → 조율 → 빈칸
// '빼기'로 시작하면 전부 가능이라 첫 터치가 바로 '안 돼요'예요.
const NEXT = { u: 'y', mix: 'y', y: 'n', n: 'm', m: 'u' }
const LOOK = {
  y: { cls: 'bg-yes-soft text-ink ring-2 ring-inset ring-yes', text: '가능' },
  m: { cls: 'bg-maybe-soft text-ink ring-2 ring-inset ring-maybe', text: '조율' },
  n: { cls: 'bg-rule2 text-ink2', text: '안 돼요' },
  u: { cls: 'bg-sheet text-ink2 ring-1 ring-inset ring-rule', text: '미입력' },
  mix: { cls: 'bg-sheet text-ink ring-1 ring-inset ring-yes', text: '일부' },
}

/**
 * 큰 칸 입력: 요일 × 시간대. 누르면 그 시간대의 30분 칸들을 한꺼번에 칠해요(저장은 30분 칸 그대로라 추천 계산은 같아요).
 * 칸 아래 'n명 돼요'는 다른 사람 중 그 시간대의 절반 이상이 가능·조율인 사람 수예요.
 */
export default function CoarseGrid({ cfg, cells, people, myPid, onChange, bounds = DEFAULT_BOUNDS }) {
  const parts = partsOf(cfg, bounds)
  const days = nDays(cfg)
  const others = people.filter((p) => p.id !== myPid)

  function setKeys(keys, value) {
    const next = { ...cells }
    keys.forEach((k) => { if (value === 'u') delete next[k]; else next[k] = value })
    onChange(next)
  }
  const tapCell = (d, part) => {
    const keys = keysOf(cfg, d, part)
    if (keys.length) setKeys(keys, NEXT[stateOf(cells, keys)])
  }
  // 요일·시간대 이름을 누르면 그 줄 전체를 같은 값으로
  const tapLine = (keys) => { if (keys.length) setKeys(keys, NEXT[stateOf(cells, keys)]) }
  const okCount = (keys) => others.filter((p) => keys.filter((k) => ['y', 'm'].includes(p.cells?.[k])).length * 2 >= keys.length).length

  return (
    <div className="flex flex-col gap-1.5" role="grid" aria-label="큰 칸으로 내 시간 입력">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `52px repeat(${parts.length}, minmax(0, 1fr))` }} role="row">
        <span />
        {parts.map((p) => (
          <button
            key={p.from}
            type="button"
            role="columnheader"
            className="flex flex-col items-center rounded-[10px] border-0 bg-transparent py-1 text-center hover:bg-rule2"
            aria-label={`${p.label} 전체 바꾸기`}
            onClick={() => tapLine(Array.from({ length: days }, (_, d) => keysOf(cfg, d, p)).flat())}
          >
            <span className="text-[13px] font-bold">{p.label}</span>
            {p.sub && <span className="text-[11px] text-ink2">{p.sub}</span>}
          </button>
        ))}
      </div>
      {Array.from({ length: days }, (_, d) => {
        const [md, dow] = dayLabel(cfg, d).split(' ')
        return (
          <div key={d} className="grid gap-1.5" style={{ gridTemplateColumns: `52px repeat(${parts.length}, minmax(0, 1fr))` }} role="row">
            <button
              type="button"
              role="rowheader"
              className="flex flex-col items-start justify-center rounded-[10px] border-0 bg-transparent px-1 text-left hover:bg-rule2"
              aria-label={`${dayLabel(cfg, d)} 하루 전체 바꾸기`}
              onClick={() => tapLine(parts.flatMap((p) => keysOf(cfg, d, p)))}
            >
              <span className="text-[14px] font-bold">{dow.replace(/[()]/g, '')}</span>
              <span className="text-[11px] text-ink2">{md}</span>
            </button>
            {parts.map((p) => {
              const keys = keysOf(cfg, d, p)
              const st = stateOf(cells, keys)
              if (st === 'x') return <span key={p.from} className="rounded-[12px] bg-[repeating-linear-gradient(135deg,var(--rule2)_0_6px,transparent_6px_12px)]" aria-hidden="true" />
              const look = LOOK[st]
              const ok = okCount(keys)
              return (
                <button
                  key={p.from}
                  type="button"
                  role="gridcell"
                  className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-[12px] border-0 transition-colors ${look.cls}`}
                  aria-label={`${dayLabel(cfg, d)} ${p.label}: ${look.text}. 누르면 바뀌어요`}
                  onClick={() => tapCell(d, p)}
                >
                  <span className="text-[14px] font-bold">{look.text}</span>
                  {others.length > 0 && <span className="text-[11px] text-ink2">{ok}명 돼요</span>}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/**
 * 시간대 나누기 맞춤: 몇 칸(2~4)과 나누는 시각. 바꾸면 바로 큰 칸이 다시 그려져요.
 * 나누는 시각은 약속 시간 범위 안에서만 고를 수 있어요.
 */
export function BoundsEditor({ cfg, bounds, onBounds }) {
  const a = rowFrom(cfg)
  const b = rowTo(cfg)
  const inRange = bounds.filter((h) => h > a && h < b).sort((x, y) => x - y)
  const count = inRange.length + 1
  const hours = Array.from({ length: Math.max(0, b - a - 1) }, (_, i) => a + 1 + i)
  // 칸 수를 바꾸면 범위를 비슷하게 나누는 시각으로
  const evenly = (n) => Array.from({ length: n - 1 }, (_, i) => Math.round(a + ((b - a) * (i + 1)) / n))
  const setCut = (i, h) => {
    const next = inRange.slice()
    next[i] = h
    onBounds([...new Set(next)].sort((x, y) => x - y))
  }
  if (hours.length < 1) return <p className="m-0 text-[12px] text-ink2">약속 시간이 짧아서 나눌 수 없어요.</p>
  return (
    <div className="flex flex-col gap-2 rounded-[12px] bg-sheet p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[13px] font-semibold">몇 칸으로</span>
        {[2, 3, 4].filter((n) => n - 1 <= hours.length).map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={count === n}
            className={`min-h-[36px] rounded-full border-0 px-3.5 text-[13px] font-semibold ${count === n ? 'bg-pen-strong text-pen-ink' : 'bg-sheet text-ink'}`}
            onClick={() => onBounds(evenly(n))}
          >
            {n}칸
          </button>
        ))}
        <button type="button" className="ml-auto border-0 bg-transparent p-1 text-[12px] font-semibold text-ink2 underline" onClick={() => onBounds(DEFAULT_BOUNDS)}>기본값</button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink2">
        <span>{a}시</span>
        {inRange.map((h, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span>~</span>
            <select
              className="field-input !min-h-[36px] w-[76px] !py-1"
              aria-label={`${i + 1}번째로 나누는 시각`}
              value={h}
              onChange={(e) => setCut(i, Number(e.target.value))}
            >
              {hours.filter((x) => (i === 0 || x > inRange[i - 1]) && (i === inRange.length - 1 || x < inRange[i + 1])).map((x) => <option key={x} value={x}>{x}시</option>)}
            </select>
          </span>
        ))}
        <span>~ {b}시</span>
      </div>
      <p className="m-0 text-[12px] text-ink2">이 기기에 저장돼서 다음 약속에도 같은 구분으로 보여요</p>
    </div>
  )
}
