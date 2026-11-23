import { useEffect, useRef } from 'react'

/**
 * 처음 들어온 사람에게 한 번: 내 시간을 어떻게 넣을지 고르기.
 * '다 돼요, 안 되는 시간만 빼기'가 가장 빨라서 맨 위·추천이에요
 * (사람들은 되는 시간을 물으면 최소한만 고르는 경향이 있어요).
 */
export default function InputStartSheet({ waiting, canCalendar, habit, onHabit, onSubtract, onSelect, onCalendar, onClose }) {
  const ref = useRef(null)
  useEffect(() => { ref.current?.showModal() }, [])
  const pick = (fn) => { ref.current?.close(); fn() }
  const opt = 'flex w-full flex-col items-start gap-0.5 rounded-[16px] border-0 px-4 py-3.5 text-left'
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      aria-labelledby="input-start-title"
      className="m-auto mb-0 w-full max-w-[480px] rounded-t-[24px] border-0 bg-sheet p-0 text-ink shadow-float backdrop:bg-black/40 sm:mb-auto sm:w-[calc(100%-32px)] sm:rounded-[20px]"
    >
      <div className="flex flex-col gap-2.5 p-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <span className="mx-auto h-1 w-9 rounded-full bg-rule sm:hidden" aria-hidden="true" />
        <h2 id="input-start-title" className="m-0 text-[19px] font-bold">내 시간을 어떻게 넣을까요?</h2>
        <p className="m-0 text-[13px] text-ink2">{waiting > 0 ? `${waiting}명이 기다려요 · ` : ''}고른 뒤에도 언제든 바꿀 수 있어요</p>
        <button type="button" className={`${opt} bg-pen-soft ring-2 ring-pen`} onClick={() => pick(onSubtract)}>
          <span className="flex w-full items-center gap-2">
            <span className="flex-1 text-[15px] font-bold text-accent">다 돼요, 안 되는 시간만 뺄게요</span>
            <span className="rounded-full bg-pen-strong px-2 text-[11px] font-bold leading-5 text-pen-ink">추천</span>
          </span>
          <span className="text-[13px] text-ink2">처음엔 전부 가능 · 안 되는 칸만 누르면 끝</span>
        </button>
        {habit && (
          <button type="button" className={`${opt} bg-rule2`} onClick={() => pick(onHabit)}>
            <span className="text-[15px] font-bold">자주 되던 시간으로 채우기</span>
            <span className="text-[13px] text-ink2">지난 약속 {habit.meetings}개에서 자주 가능했던 시간 · 채운 뒤 고칠 수 있어요</span>
          </button>
        )}
        <button type="button" className={`${opt} bg-rule2`} onClick={() => pick(onSelect)}>
          <span className="text-[15px] font-bold">되는 시간만 고를게요</span>
          <span className="text-[13px] text-ink2">바쁜 주라면 · 되는 칸만 눌러요</span>
        </button>
        {canCalendar && (
          <button type="button" className={`${opt} bg-rule2`} onClick={() => pick(onCalendar)}>
            <span className="text-[15px] font-bold">Google 캘린더로 채우기</span>
            <span className="text-[13px] text-ink2">캘린더의 바쁜 시간은 빼고 나머지를 가능으로 채워요</span>
          </button>
        )}
      </div>
    </dialog>
  )
}
