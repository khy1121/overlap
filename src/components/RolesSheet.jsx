import { useEffect, useRef } from 'react'
import Avatar from './Avatar'

const ROLES = [
  ['required', '꼭'],
  ['optional', '선택'],
  ['absent', '불참'],
]

/**
 * 참석자 꼭 / 선택 / 불참 정하기 (약속 만든 사람만).
 * 선택은 추천에 반만 반영하고 '모두 되면 확정' 조건에서 빼요. 불참은 계산에서 빼요.
 */
export default function RolesSheet({ people, myPid, autoConfirm, onRole, onAutoConfirm, onClose }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.showModal() }, [])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="roles-title"
      className="m-auto mb-0 w-full max-w-[480px] rounded-t-[24px] border-0 bg-sheet p-0 text-ink shadow-float backdrop:bg-black/40 sm:mb-auto sm:w-[calc(100%-32px)] sm:rounded-[20px]"
    >
      <div className="flex max-h-[85vh] flex-col gap-3 overflow-y-auto p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <span className="mx-auto h-1 w-9 rounded-full bg-rule sm:hidden" aria-hidden="true" />
        <h2 id="roles-title" className="m-0 text-[19px] font-bold">누가 꼭 와야 하나요?</h2>
        <p className="m-0 text-[13px] text-ink2">꼭 와야 하는 사람이 모두 되는 시간이 생기면 알려 드려요. 선택은 추천에 반만 반영해요.</p>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {people.map((p) => (
            <li key={p.id} className="flex min-h-[52px] items-center gap-2.5">
              <Avatar name={p.name} url={p.avatar_url} size={32} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{p.id === myPid ? `${p.name || '나'} (나)` : p.name || '이름 없음'}</span>
              <span className="inline-flex gap-0.5 rounded-[12px] bg-rule2 p-0.5" role="radiogroup" aria-label={`${p.name || '이름 없음'} 참석`}>
                {ROLES.map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={p.role === v}
                    className={`min-h-[36px] rounded-[10px] border-0 px-3 text-[13px] font-semibold ${p.role === v ? 'bg-sheet text-ink shadow-soft' : 'bg-transparent text-ink2'}`}
                    onClick={() => onRole(p, v)}
                  >
                    {label}
                  </button>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <label className="flex items-start gap-3 rounded-[16px] bg-rule2 px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-semibold">모두 되면 자동으로 확정</span>
            <span className="block text-[13px] text-ink2">꼭 와야 하는 사람이 모두 가능한 시간이 생기면 바로 확정하고 알림을 보내요. 후보가 여럿이면 가장 이른 시간이에요.</span>
          </span>
          <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={autoConfirm} onChange={(e) => onAutoConfirm(e.target.checked)} />
        </label>
        <button className="btn-primary btn-lg" onClick={() => ref.current?.close()}>완료</button>
      </div>
    </dialog>
  )
}
