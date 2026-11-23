import { blocked, dayLabel, nDays, rowFrom, rowTo } from '../lib/schedule'

/**
 * 약속 시간 범위를 큰 시간대로 나눠요.
 * 범위가 넓으면 오전(~12시) · 오후(12~18시) · 저녁(18시~), 좁으면(예: 18~23시) 1~2시간 단위로 3칸쯤.
 * 결과: [{ from, to, label, sub }] (시각은 정수 시)
 */
export function partsOf(cfg) {
  const a = rowFrom(cfg)
  const b = rowTo(cfg)
  const named = [[0, 12, '오전'], [12, 18, '오후'], [18, 24, '저녁']]
    .map(([x, y, label]) => ({ from: Math.max(a, x), to: Math.min(b, y), label }))
    .filter((p) => p.to - p.from >= 1)
  if (named.length >= 2) return named.map((p) => ({ ...p, sub: `${p.from}–${p.to}시` }))
  // 한 시간대 안에 들어가는 좁은 범위: 비슷한 길이로 3칸 (1시간 미만 칸은 만들지 않아요)
  const len = b - a
  const n = Math.min(3, Math.max(1, len))
  const step = Math.ceil(len / n)
  const out = []
  for (let h = a; h < b; h += step) out.push({ from: h, to: Math.min(b, h + step), label: `${h}–${Math.min(b, h + step)}시`, sub: '' })
  return out
}

/** 그 요일·시간대에 속한 30분 칸 키 (약속 범위 밖 칸은 빼요) */
export function keysOf(cfg, d, part) {
  const keys = []
  const base = rowFrom(cfg)
  for (let s = (part.from - base) * 2; s < (part.to - base) * 2; s++) if (!blocked(cfg, d, s)) keys.push(`${d}-${s}`)
  return keys
}

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
export default function CoarseGrid({ cfg, cells, people, myPid, onChange }) {
  const parts = partsOf(cfg)
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
