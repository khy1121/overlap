import { useEffect, useState } from 'react'
import { applyBusy, fetchBusy } from '@overlap/core/api/calendar'

/** Google 캘린더 free/busy만 읽어서 바쁜 칸을 찾는다. 일정 제목·내용은 받지 않는다. */
export default function CalendarImport({ cfg, token, cells, onApply, onClose, onExpired }) {
  const [state, setState] = useState({ status: 'loading' })
  const [markBusy, setMarkBusy] = useState(true)
  const [fillFree, setFillFree] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // free/busy 읽기·칸 나누기는 @overlap/core (앱과 같아요)
      try {
        const { busyKeys, freeKeys } = await fetchBusy(token, cfg)
        if (!cancelled) setState({ status: 'ready', busyKeys, freeKeys })
      } catch (e) {
        if (e.code === 'expired') {
          onExpired()
          if (!cancelled) setState({ status: 'error', message: '캘린더 권한이 만료됐거나 허용되지 않았어요. 버튼을 다시 눌러 주세요.' })
          return
        }
        if (!cancelled) setState({ status: 'error', message: '캘린더를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cfg, token, onExpired])

  function apply() {
    const { next, changed } = applyBusy(cells, state, { markBusy, fillFree })
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
