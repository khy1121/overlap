import { useState } from 'react'
import { useUpdateReady } from '../lib/updates'

/** 화면 아래 '새 버전이 있어요 · 새로고침' 안내 */
export default function UpdateBanner() {
  const ready = useUpdateReady()
  const [hidden, setHidden] = useState(false)
  if (!ready || hidden) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 z-40 mx-auto flex w-[calc(100%-24px)] max-w-[480px] items-center gap-3 rounded-[16px] bg-ink px-4 py-3 text-sheet shadow-float"
      style={{ bottom: 'max(16px, calc(env(safe-area-inset-bottom, 0px) + 12px))' }}
    >
      <span className="min-w-0 flex-1 text-[14px] font-semibold">새 버전이 있어요</span>
      <button className="btn-ghost btn-sm !text-sheet/70 hover:!bg-transparent" onClick={() => setHidden(true)}>나중에</button>
      <button className="btn-primary btn-sm" onClick={() => window.location.reload()}>새로고침</button>
    </div>
  )
}
