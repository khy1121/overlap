import { useEffect, useRef, useState } from 'react'
import { DAYS, blocked, dayLabel, dayOf, md, nDays, nSlots, tm } from '../lib/schedule'

/**
 * 주간 시간표.
 * edit 모드: 누르거나 드래그해서 칠함(놓을 때 onCommit 한 번), 요일/시간 머리글로 줄 전체 칠하기.
 * all 모드: 가능한 사람 수를 진하기로 보여 주고 칸을 누르면 onSelect.
 * canPaint가 false면 칠하지 않고 스크롤만 돼요. 이때 칸을 탭하면 onLockedTap.
 */
const HOLD_MS = 320 // 이만큼 누르고 있으면 터치 칠하기 시작
const HOLD_MOVE = 8 // 그 전에 이만큼(px) 움직이면 스크롤로 봐요

export default function TimeGrid({ cfg, people, mode, cells, canPaint, brush, sel, onSelect, onCommit, onFill, onAnnounce, onLockedTap }) {
  const gridRef = useRef(null)
  const [draft, setDraft] = useState(null)
  const drag = useRef(null) // { val, cells, touch }
  // 터치 길게 누르기 대기: { k, x, y, timer }. 손가락이 움직이면 스크롤로 보고 취소, 가만히 있으면 칠하기 시작
  const hold = useRef(null)
  const [cur, setCur] = useState({ d: 0, s: 0 })
  const slots = nSlots(cfg)
  const days = nDays(cfg)
  const shown = draft || cells
  const n = Math.max(cfg.count, people.length)
  const picked = cfg.picked

  useEffect(() => {
    setCur((c) => ({ ...c, s: Math.min(c.s, slots - 1) }))
  }, [slots])

  // 칠하기가 꺼지면 진행 중이던 드래그를 버려요
  useEffect(() => {
    if (canPaint) return
    cancelHold()
    drag.current = null
    setDraft(null)
  }, [canPaint])

  // 터치로 칠하는 동안에는 브라우저 스크롤을 막아요. 길게 누르기 전에는 막지 않아서 그냥 쓸면 스크롤돼요.
  useEffect(() => {
    const el = gridRef.current
    if (!el) return
    const block = (e) => { if (drag.current?.touch && e.cancelable) e.preventDefault() }
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [])

  useEffect(() => {
    const end = () => {
      cancelHold() // 스크롤이 시작되면(pointercancel) 길게 누르기도 취소
      if (!drag.current) return
      const next = drag.current.cells
      drag.current = null
      setDraft(null)
      onCommit(next)
    }
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    return () => {
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
    }
  }, [onCommit])

  const keyAt = (x, y) => {
    const el = document.elementFromPoint(x, y)
    return el && el.dataset && el.dataset.k && gridRef.current?.contains(el) ? el.dataset.k : null
  }
  const apply = (k) => {
    const c = drag.current.cells
    if (drag.current.val) {
      if (c[k] === drag.current.val) return
      c[k] = drag.current.val
    } else {
      if (!(k in c)) return
      delete c[k]
    }
    setDraft({ ...c })
  }

  function cancelHold() {
    if (!hold.current) return
    clearTimeout(hold.current.timer)
    hold.current = null
  }
  function beginDrag(k, touch) {
    gridRef.current?.focus({ preventScroll: true })
    drag.current = { val: brush && cells[k] === brush ? '' : brush, cells: { ...cells }, touch }
    apply(k)
    if (touch) navigator.vibrate?.(12)
  }
  function onPointerDown(e) {
    const k = keyAt(e.clientX, e.clientY)
    if (!k) return
    const [d, s] = k.split('-').map(Number)
    setCur({ d, s })
    if (mode === 'all') return onSelect({ d, s })
    if (!canPaint) return
    if (e.pointerType === 'touch') {
      // 터치는 바로 칠하지 않아요. 짧게 톡 치면 한 칸(onPointerUp), 길게 누르면 드래그 칠하기, 쓸면 스크롤.
      cancelHold()
      hold.current = { k, x: e.clientX, y: e.clientY, timer: setTimeout(() => { hold.current = null; beginDrag(k, true) }, HOLD_MS) }
      return
    }
    e.preventDefault()
    beginDrag(k, false)
  }
  function onPointerMove(e) {
    if (hold.current) {
      if (Math.hypot(e.clientX - hold.current.x, e.clientY - hold.current.y) > HOLD_MOVE) cancelHold()
      return
    }
    if (!drag.current) return
    const k = keyAt(e.clientX, e.clientY)
    if (k) apply(k)
  }
  function onPointerUp() {
    // 길게 누르기 전에 뗐으면 짧은 탭: 그 칸 하나만 토글
    if (!hold.current) return
    const k = hold.current.k
    cancelHold()
    toggle(k)
  }
  function toggle(k) {
    const next = { ...cells }
    if (brush && cells[k] === brush) delete next[k]
    else if (brush) next[k] = brush
    else delete next[k]
    onCommit(next)
  }
  function onKeyDown(e) {
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (mv) {
      e.preventDefault()
      const next = { d: Math.max(0, Math.min(days - 1, cur.d + mv[0])), s: Math.max(0, Math.min(slots - 1, cur.s + mv[1])) }
      setCur(next)
      if (mode === 'all') onSelect(next)
      else if (e.shiftKey && canPaint && brush) onCommit({ ...cells, [`${next.d}-${next.s}`]: brush })
      onAnnounce?.(next)
      return
    }
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      if (blocked(cfg, cur.d, cur.s)) return
      if (mode === 'all') return onSelect(cur)
      if (canPaint) toggle(`${cur.d}-${cur.s}`)
    }
  }

  const weekend = Array.from({ length: days }, (_, d) => [0, 6].includes(dayOf(cfg, d).getDay()))
  const out = [<div key="corner" />]

  for (let d = 0; d < days; d++) {
    const head = (
      <>
        <b className={`block font-display text-[15px] font-extrabold ${weekend[d] ? 'text-no' : ''}`}>{DAYS[dayOf(cfg, d).getDay()]}</b>
        <span className="font-mono text-[11px] text-ink2">{md(cfg, d)}</span>
      </>
    )
    out.push(
      <div key={`h${d}`} className="pb-2 pt-0.5 text-center leading-tight">
        {mode === 'edit' && canPaint ? (
          <button
            className="w-full rounded p-0 hover:bg-cell"
            title={`${dayLabel(cfg, d)} 하루 전체 칠하기`}
            aria-label={`${dayLabel(cfg, d)} 하루 전체 칠하기`}
            onClick={() => onFill(Array.from({ length: slots }, (_, s) => `${d}-${s}`).filter((k) => !blocked(cfg, d, Number(k.split('-')[1]))))}
          >
            {head}
          </button>
        ) : (
          head
        )}
      </div>,
    )
  }

  for (let s = 0; s < slots; s++) {
    const hour = s % 2 === 0
    out.push(
      <div key={`t${s}`} className="tl">
        {hour && mode === 'edit' && canPaint ? (
          <button
            className="h-full w-full rounded-[3px] p-0 text-right hover:bg-cell"
            title={`${tm(cfg, s)}–${tm(cfg, s + 2)} 일주일 전체 칠하기`}
            aria-label={`${tm(cfg, s)}–${tm(cfg, s + 2)} 일주일 전체 칠하기`}
            onClick={() => {
              const keys = []
              for (let d = 0; d < days; d++) {
                if (!blocked(cfg, d, s)) keys.push(`${d}-${s}`)
                if (s + 1 < slots && !blocked(cfg, d, s + 1)) keys.push(`${d}-${s + 1}`)
              }
              onFill(keys)
            }}
          >
            {tm(cfg, s)}
          </button>
        ) : hour ? (
          tm(cfg, s)
        ) : null}
      </div>,
    )
    for (let d = 0; d < days; d++) {
      const k = `${d}-${s}`
      // 약속 범위 밖 칸: 칠할 수도 고를 수도 없어요 (data-k를 빼서 포인터가 무시하게)
      if (blocked(cfg, d, s)) {
        out.push(<div key={k} className={`c off ${hour ? 'hr' : 'hh'}`} aria-hidden="true" />)
        continue
      }
      let cls = `c ${hour ? 'hr' : 'hh'}${weekend[d] ? ' we' : ''}`
      let style
      let title
      if (mode === 'edit') {
        if (shown[k]) cls += ` ${shown[k]}`
      } else {
        let y = 0
        let m = 0
        people.forEach((p) => {
          const v = p.cells[k]
          if (v === 'y') y++
          else if (v === 'm') m += 0.5
        })
        const r = n ? (y + m) / n : 0
        if (r > 0) style = { background: `color-mix(in oklab, var(--yes) ${Math.round(12 + r * 88)}%, var(--cell))` }
        title = `${dayLabel(cfg, d)} ${tm(cfg, s)} · 가능 ${y}명`
        if (sel && sel.d === d && sel.s === s) cls += ' sel'
      }
      if (cur.d === d && cur.s === s) cls += ' cur'
      if (picked && picked.d === d && s >= picked.s && s < picked.s + (picked.dur || 1)) {
        cls += ' pick'
        if (s === picked.s) cls += ' top'
        if (s === picked.s + (picked.dur || 1) - 1) cls += ' bot'
      }
      out.push(<div key={k} data-k={k} className={cls} style={style} title={title} />)
    }
  }

  return (
    <div className="overflow-x-auto">
      <div
        ref={gridRef}
        tabIndex={0}
        role="application"
        aria-label="주간 시간표. 방향키로 이동하고 스페이스로 칠합니다."
        style={{ '--days': days }}
        className={`timegrid ${days > 7 ? 'wide ' : ''}${mode === 'all' ? 'view' : 'edit'}${mode === 'edit' && canPaint ? ' paint' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onContextMenu={(e) => { if (canPaint) e.preventDefault() }}
        onKeyDown={onKeyDown}
        onClick={(e) => { if (mode === 'edit' && !canPaint && e.target.dataset?.k) onLockedTap?.() }}
      >
        {out}
      </div>
    </div>
  )
}
