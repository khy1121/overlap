import { useEffect, useState } from 'react'
import { nDays, nSlots, slotRange } from '../lib/schedule'

/** Google 캘린더 free/busy만 읽어서 바쁜 칸을 찾는다. 일정 제목·내용은 받지 않는다. */
export default function CalendarImport({ cfg, token, cells, onApply, onClose, onExpired }) {
  const [state, setState] = useState({ status: 'loading' })
  const [markBusy, setMarkBusy] = useState(true)
  const [fillFree, setFillFree] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [t0] = slotRange(cfg, 0, 0)
      const [, t1] = slotRange(cfg, nDays(cfg) - 1, nSlots(cfg) - 1)
      try {
        const r = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeMin: new Date(t0).toISOString(), timeMax: new Date(t1).toISOString(), items: [{ id: 'primary' }] }),
        })
        if (r.status === 401 || r.status === 403) {
          onExpired()
          if (!cancelled) setState({ status: 'error', message: '캘린더 권한이 만료됐거나 허용되지 않았어요. 버튼을 다시 눌러 주세요.' })
          return
        }
        const j = await r.json()
        const busy = (j.calendars?.primary?.busy || []).map((b) => [Date.parse(b.start), Date.parse(b.end)])
        const busyKeys = []
        const freeKeys = []
        for (let d = 0; d < nDays(cfg); d++) {
          for (let s = 0; s < nSlots(cfg); s++) {
            const [a, b] = slotRange(cfg, d, s)
            ;(busy.some(([x, y]) => x < b && y > a) ? busyKeys : freeKeys).push(`${d}-${s}`)
          }
        }
        if (!cancelled) setState({ status: 'ready', busyKeys, freeKeys })
      } catch {
        if (!cancelled) setState({ status: 'error', message: '캘린더를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cfg, token, onExpired])

  function apply() {
    const next = { ...cells }
    let changed = 0
    if (markBusy) state.busyKeys.forEach((k) => { if (next[k] !== 'n') { next[k] = 'n'; changed++ } })
    if (fillFree) state.freeKeys.forEach((k) => { if (!next[k]) { next[k] = 'y'; changed++ } })
    onApply(next, changed)
  }

  return (
    <div className="mb-2.5 flex flex-col gap-2 rounded-md border border-dashed border-rule px-3 py-2.5 text-[13px]">
      {state.status === 'loading' && '캘린더에서 바쁜 시간을 확인하는 중…'}
      {state.status === 'error' && (
        <>
          {state.message}
          <div><button className="btn" onClick={onClose}>닫기</button></div>
        </>
      )}
      {state.status === 'ready' && (
        <>
          <div>이번 주 캘린더에서 바쁜 시간 {state.busyKeys.length / 2}시간을 찾았어요. 일정 제목이나 내용은 가져오지 않아요.</div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={markBusy} onChange={(e) => setMarkBusy(e.target.checked)} />
            바쁜 시간을 불가로 표시
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={fillFree} onChange={(e) => setFillFree(e.target.checked)} />
            나머지 비어 있는 시간을 가능으로 채우기
          </label>
          <div className="flex gap-1.5">
            <button className="btn-primary" onClick={apply}>적용</button>
            <button className="btn" onClick={onClose}>닫기</button>
          </div>
        </>
      )}
    </div>
  )
}
