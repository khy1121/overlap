import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'

function NameEditor({ person, onSave, onCancel }) {
  const [value, setValue] = useState(person.name)
  const ref = useRef()
  const done = useRef(false)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  const finish = (fn) => {
    if (done.current) return
    done.current = true
    fn()
  }
  return (
    <span className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-pen bg-sheet py-[3px] pl-1.5 pr-1 text-[13px]">
      <Avatar name={value || person.name} url={person.avatar_url} />
      <input
        ref={ref}
        maxLength={30}
        aria-label="이름"
        placeholder="이름"
        autoComplete="off"
        className="w-[110px] border-0 bg-transparent px-1 py-0.5 text-[15px] text-ink focus-visible:outline-none"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); finish(() => onSave(value.trim())) }
          else if (e.key === 'Escape') finish(onCancel)
        }}
        onBlur={() => setTimeout(() => finish(() => onSave(value.trim())), 150)}
      />
      <button className="rounded-full bg-ink px-2.5 py-0.5 text-xs text-sheet" onMouseDown={(e) => e.preventDefault()} onClick={() => finish(() => onSave(value.trim()))}>
        저장
      </button>
    </span>
  )
}

/**
 * 참여자 카드 (탭 위에 한 줄). 아바타를 가로로 넘겨 보고, 입력한 사람은 초록 체크로 표시해요.
 * 일정은 각자 본인 것만 입력할 수 있어서, 고칠 수 있는 건 내 이름뿐이에요.
 */
export default function PeopleBar({ people, myPid, target, mode, n, canEdit, editing, setEditing, onSelect, onRename, relation, onFriend }) {
  const done = people.filter((p) => Object.keys(p.cells).length > 0)
  const pct = n ? Math.min(100, Math.round((done.length / n) * 100)) : 0
  return (
    <section className="sheet !px-4 !py-3" aria-label="참여자">
      <div className="mb-2.5 flex items-center gap-3">
        <span className="text-[15px] font-bold">참여자 <span className="text-ink2">{people.length}</span></span>
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-xs text-ink2">
          <span className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-rule" aria-hidden="true">
            <span className="block h-full rounded-full bg-yes" style={{ width: `${pct}%` }} />
          </span>
          <span className="shrink-0 tabular">{done.length}/{n}명 입력</span>
        </span>
      </div>
      <ul className="-mx-1 m-0 flex list-none gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {people.map((p) => {
          if (editing === p.id) {
            return (
              <li key={p.id} className="shrink-0 self-center">
                <NameEditor person={p} onSave={(v) => onRename(p.id, v)} onCancel={() => setEditing(null)} />
              </li>
            )
          }
          const me = p.id === myPid
          const active = p.id === target && mode === 'edit'
          const entered = Object.keys(p.cells).length > 0
          const editable = canEdit(p.id)
          // 같은 약속의 다른 가입자: 친구가 아니면 '+ 친구'로 신청
          const rel = p.user_id && !me && relation ? relation(p.user_id) : null
          return (
            <li key={p.id} className="flex w-[68px] shrink-0 flex-col items-center gap-1">
              <button
                aria-pressed={active}
                title={entered ? '입력함' : '아직 입력 안 함'}
                aria-label={`${p.name || '이름 없음'}${me ? ' (나)' : ''} · ${entered ? '입력함' : '아직 입력 안 함'}`}
                className="relative rounded-full border-0 bg-transparent p-0"
                onClick={() => onSelect(p.id)}
              >
                <span className={`block rounded-full p-[2px] ${me ? 'bg-pen' : entered ? 'bg-yes' : 'bg-rule'}`}>
                  <span className="block rounded-full bg-sheet p-[2px]">
                    <Avatar name={p.name} url={p.avatar_url} size={40} className={entered ? '' : 'opacity-60'} />
                  </span>
                </span>
                {entered && (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-[18px] w-[18px] place-items-center rounded-full bg-yes text-white ring-2 ring-sheet" aria-hidden="true">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                )}
              </button>
              <span className="flex w-full items-center justify-center gap-0.5 text-[12px] font-semibold leading-tight">
                <span className="truncate">{me ? '나' : p.name || '이름 없음'}</span>
                {editable && (
                  <button className="shrink-0 border-0 bg-transparent p-0 text-[11px] leading-none text-ink2 hover:text-ink" aria-label="내 이름 바꾸기" title="이름 바꾸기" onClick={() => setEditing(p.id)}>✎</button>
                )}
              </span>
              {!p.user_id && <span className="text-[10px] leading-none text-ink2">계정 없음</span>}
              {rel === 'none' && (
                <button className="border-0 bg-transparent p-0 text-[11px] font-semibold leading-none text-accent" aria-label={`${p.name || '이름 없음'}에게 친구 신청`} onClick={() => onFriend(p)}>
                  + 친구
                </button>
              )}
              {rel === 'pending' && <span className="text-[10px] leading-none text-ink2">신청함</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
