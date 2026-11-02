import { useEffect, useRef, useState } from 'react'
import Avatar from './Avatar'

function NameEditor({ person, canRemove, onSave, onCancel, onRemove }) {
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
      {canRemove && (
        <button className="px-1.5 py-0.5 text-xs text-no" onMouseDown={(e) => e.preventDefault()} onClick={() => finish(onRemove)}>
          삭제
        </button>
      )}
    </span>
  )
}

export default function PeopleBar({ people, myPid, target, mode, n, canEdit, canRemove, editing, setEditing, onSelect, onRename, onRemove, onAddGuest }) {
  const done = people.filter((p) => Object.keys(p.cells).length > 0)
  return (
    <>
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1.5">
        <span className="text-[13px] font-semibold">누구의 시간을 입력할까요?</span>
        <span className="flex items-center gap-2 text-xs text-ink2">
          <span className="flex flex-wrap gap-0.5" aria-hidden="true">
            {Array.from({ length: n }, (_, i) => (
              <i key={i} className={`h-1.5 w-2.5 rounded-[1px] ${people[i] && Object.keys(people[i].cells).length ? 'bg-yes' : 'bg-rule'}`} />
            ))}
          </span>
          {done.length}/{n}명 입력
        </span>
      </div>
      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {people.map((p) => {
          if (editing === p.id) {
            return (
              <NameEditor
                key={p.id}
                person={p}
                canRemove={canRemove(p.id)}
                onSave={(v) => onRename(p.id, v)}
                onCancel={() => setEditing(null)}
                onRemove={() => onRemove(p.id)}
              />
            )
          }
          const active = p.id === target && mode === 'edit'
          const entered = Object.keys(p.cells).length > 0
          const editable = canEdit(p.id)
          return (
            <button
              key={p.id}
              aria-pressed={active}
              title={editable ? (entered ? '입력함' : '아직 입력 안 함') : '본인만 고칠 수 있어요'}
              className={`inline-flex min-h-[34px] items-center gap-[7px] rounded-full border py-[5px] pl-1.5 pr-3 text-[13px] ${
                active ? 'border-ink bg-ink text-sheet' : 'border-rule bg-sheet hover:border-ink2'
              } ${editable ? '' : 'opacity-75'}`}
              onClick={() => onSelect(p.id)}
            >
              <Avatar
                name={p.name}
                url={p.avatar_url}
                className={active ? '!bg-sheet !text-ink' : entered ? '!bg-yes-soft !text-ink' : ''}
              />
              {p.name || '이름 없음'}
              {p.id === myPid && <span className="rounded-[3px] bg-pen px-1.5 text-[10px] font-semibold text-pen-ink">나</span>}
              {!p.user_id && <span className="rounded-[3px] border border-current px-1.5 text-[10px] font-semibold opacity-70">대리 입력</span>}
              {editable && (
                <span
                  role="button"
                  aria-label={`${p.name || '이름 없음'} 이름 바꾸기`}
                  title="이름 바꾸기"
                  className="pl-0.5 text-xs leading-none opacity-60 hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditing(p.id)
                  }}
                >
                  ✎
                </span>
              )}
            </button>
          )
        })}
        <button
          className="min-h-[34px] rounded-full border border-dashed border-ink2 bg-transparent px-3 py-1 text-xs text-ink2"
          title="가입하지 않은 사람 대신 시간을 입력할 때 써요"
          onClick={onAddGuest}
        >
          + 계정 없는 사람 추가
        </button>
      </div>
    </>
  )
}
