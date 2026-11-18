import { useEffect, useRef } from 'react'
import MeetingExit from './MeetingExit'

/**
 * 약속 화면 오른쪽 위 ⋯ 메뉴 (아래에서 올라오는 시트).
 * 자주 안 쓰는 기능을 여기로 모아서 약속 화면은 한눈에 보이게 둬요.
 * items: [{ key, label, desc, onClick }] — 누르면 시트를 닫고 실행해요.
 */
export default function BoardMenu({ items, isOwner, onExit, onClose }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="약속 메뉴"
      className="m-auto mb-0 w-full max-w-[480px] rounded-t-[24px] border-0 bg-sheet p-0 text-ink shadow-float backdrop:bg-black/40 sm:mb-auto sm:w-[calc(100%-32px)] sm:rounded-[20px]"
    >
      <div className="flex flex-col p-4 pb-[max(20px,env(safe-area-inset-bottom))]">
        <span className="mx-auto mb-2 h-1 w-9 rounded-full bg-rule sm:hidden" aria-hidden="true" />
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map((it) => (
            <li key={it.key}>
              <button
                type="button"
                className="flex min-h-[56px] w-full flex-col items-start justify-center gap-0.5 rounded-[12px] border-0 bg-transparent px-3 py-2.5 text-left hover:bg-rule2"
                onClick={() => { ref.current?.close(); it.onClick() }}
              >
                <span className="text-[15px] font-semibold">{it.label}</span>
                {it.desc && <span className="text-[13px] text-ink2">{it.desc}</span>}
              </button>
            </li>
          ))}
        </ul>
        <MeetingExit isOwner={isOwner} onConfirm={onExit} />
      </div>
    </dialog>
  )
}
