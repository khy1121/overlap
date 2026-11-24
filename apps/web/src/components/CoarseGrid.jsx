import { useRef, useState } from 'react'
import { dayLabel, nDays, rowFrom, rowTo } from '@overlap/core/schedule'
import { DEFAULT_BOUNDS, keysOf, partsOf } from '@overlap/core/parts'
import { fill, longValue, paintState, tapValue } from '@overlap/core/paint'

// 약속 화면이 쓰던 이름 그대로 (원래 여기 있던 계산은 core로 옮겼어요)
export { DEFAULT_BOUNDS, keysOf, partsOf }

const LONG_MS = 450
const LOOK = {
  y: { cls: 'bg-yes text-white ring-1 ring-inset ring-yes', mark: '✓', text: '돼요' },
  m: { cls: 'paint-maybe text-ink ring-2 ring-inset ring-maybe', mark: '~', text: '애매해요' },
  mix: { cls: 'bg-yes-soft text-ink ring-1 ring-inset ring-yes', mark: '·', text: '일부 돼요' },
  '': { cls: 'bg-sheet text-ink2 ring-1 ring-inset ring-rule', mark: '', text: '안 돼요' },
}

/**
 * 큰 칸 칠하기 (앱과 같은 방식): 되는 시간만, 한 번에 여러 칸.
 * - 누르기: 돼요(✓) ↔ 빈칸 / 길게 누르기(또는 Shift+Enter): 애매해요(~) ↔ 빈칸
 * - 끌기: 시작 칸이 빈칸이면 칠하고, 칠한 칸이면 지우면서 지나간 칸 모두 (휴대폰에서는 가로로 긋기, 세로로 밀면 화면이 움직여요)
 * - 요일·시간대 이름: 그 줄 전체 (전부 돼요면 지우기)
 * 저장은 30분 칸 그대로라 추천 계산은 같아요. 한 칸이라도 칠하면 빈칸은 '안 돼요'로 계산해요.
 * onBegin(): 한 번의 동작 시작(되돌리기 기록), onSet(next): 칸 바꾸기, onLongHint(): 처음 누를 때 '길게 누르기' 안내
 */
export default function CoarseGrid({ cfg, cells, onBegin, onSet, onLongHint, bounds = DEFAULT_BOUNDS }) {
  const parts = partsOf(cfg, bounds)
  const days = nDays(cfg)
  const cols = `52px repeat(${parts.length}, minmax(0, 1fr))`
  const [pressing, setPressing] = useState(null)
  const g = useRef(null)
  const cellsRef = useRef(cells)
  cellsRef.current = cells

  const keysAt = (id) => {
    const [d, col] = id.split('-').map(Number)
    return keysOf(cfg, d, parts[col])
  }
  const setLine = (keys) => {
    if (!keys.length) return
    onBegin()
    onSet(fill(cellsRef.current, keys, tapValue(cellsRef.current, keys)))
  }
  const cellFromPoint = (x, y) => {
    const el = document.elementFromPoint(x, y)?.closest?.('[data-cell]')
    return el && el.closest('[data-paint-grid]') ? el.dataset.cell : null
  }

  function onPointerDown(e) {
    const id = e.target.closest?.('[data-cell]')?.dataset.cell
    if (!id || e.button > 0) return
    const keys = keysAt(id)
    g.current = { id, last: id, keys, moved: false, long: false, value: tapValue(cellsRef.current, keys), pid: e.pointerId }
    setPressing(id)
    g.current.timer = setTimeout(() => {
      const cur = g.current
      if (!cur || cur.moved) return
      cur.long = true
      setPressing(null)
      navigator.vibrate?.(15)
      onBegin()
      onSet(fill(cellsRef.current, keys, longValue(cellsRef.current, keys)))
    }, LONG_MS)
  }
  function onPointerMove(e) {
    const cur = g.current
    if (!cur || cur.long || e.pointerId !== cur.pid) return
    const id = cellFromPoint(e.clientX, e.clientY)
    if (!id || id === cur.last) return
    let next = cellsRef.current
    if (!cur.moved) {
      cur.moved = true
      clearTimeout(cur.timer)
      setPressing(null)
      onBegin()
      next = fill(next, cur.keys, cur.value)
    }
    cur.last = id
    next = fill(next, keysAt(id), cur.value)
    cellsRef.current = next
    onSet(next)
  }
  function onPointerUp(e) {
    const cur = g.current
    if (!cur || e.pointerId !== cur.pid) return
    g.current = null
    setPressing(null)
    clearTimeout(cur.timer)
    if (!cur.moved && !cur.long) {
      onBegin()
      onSet(fill(cellsRef.current, cur.keys, cur.value))
      onLongHint?.()
    }
  }
  // 휴대폰에서 세로로 밀어 화면이 움직이면 칠하기를 멈춰요
  function onPointerCancel() {
    if (g.current) clearTimeout(g.current.timer)
    g.current = null
    setPressing(null)
  }
  function onKeyDown(e, id) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    const keys = keysAt(id)
    onBegin()
    onSet(fill(cellsRef.current, keys, e.shiftKey ? longValue(cellsRef.current, keys) : tapValue(cellsRef.current, keys)))
  }

  return (
    <div className="flex flex-col gap-1.5" role="grid" aria-label="되는 시간 칠하기">
      <div className="grid gap-1.5" style={{ gridTemplateColumns: cols }} role="row">
        <span />
        {parts.map((p) => (
          <button
            key={p.from}
            type="button"
            role="columnheader"
            className="flex flex-col items-center rounded-[10px] border-0 bg-transparent py-1 text-center hover:bg-rule2"
            aria-label={`${p.label} 전체`}
            onClick={() => setLine(Array.from({ length: days }, (_, d) => keysOf(cfg, d, p)).flat())}
          >
            <span className="text-[13px] font-bold">{p.label}</span>
            {p.sub && <span className="text-[11px] text-ink2">{p.sub}</span>}
          </button>
        ))}
      </div>
      <div
        data-paint-grid
        className="flex select-none flex-col gap-1.5"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
      >
        {Array.from({ length: days }, (_, d) => {
          const [md, dow] = dayLabel(cfg, d).split(' ')
          return (
            <div key={d} className="grid gap-1.5" style={{ gridTemplateColumns: cols }} role="row">
              <button
                type="button"
                role="rowheader"
                className="flex flex-col items-start justify-center rounded-[10px] border-0 bg-transparent px-1 text-left hover:bg-rule2"
                aria-label={`${dayLabel(cfg, d)} 하루 전체`}
                onClick={() => setLine(parts.flatMap((p) => keysOf(cfg, d, p)))}
              >
                <span className="text-[14px] font-bold">{dow.replace(/[()]/g, '')}</span>
                <span className="text-[11px] text-ink2">{md}</span>
              </button>
              {parts.map((p, col) => {
                const keys = keysOf(cfg, d, p)
                const st = paintState(cells, keys)
                if (st === 'x') return <span key={p.from} className="rounded-[12px] bg-[repeating-linear-gradient(135deg,var(--rule2)_0_6px,transparent_6px_12px)]" aria-hidden="true" />
                const look = LOOK[st]
                const id = `${d}-${col}`
                return (
                  <div
                    key={p.from}
                    role="gridcell"
                    tabIndex={0}
                    data-cell={id}
                    aria-label={`${dayLabel(cfg, d)} ${p.label}: ${look.text}. Enter 돼요, Shift+Enter 애매해요`}
                    onKeyDown={(e) => onKeyDown(e, id)}
                    className={`flex min-h-[52px] cursor-pointer touch-pan-y items-center justify-center rounded-[12px] text-[18px] font-extrabold transition-[background-color,transform] duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-pen ${look.cls} ${pressing === id ? 'scale-95' : ''}`}
                  >
                    {look.mark}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
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
