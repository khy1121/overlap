import { useState } from 'react'

/**
 * 약속 화면 맨 아래 빨간 버튼: 참여자는 '약속 나가기', 만든 사람은 '약속 삭제'.
 * 되돌리기 어려운 동작이라 한 번 누르면 설명과 확인 버튼이 나와요.
 */
export default function MeetingExit({ isOwner, onConfirm }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const t = isOwner
    ? { button: '약속 삭제', confirm: '정말 삭제할게요', label: '이 약속을 지우면 모든 참여자의 일정 입력도 함께 사라져요. 되돌릴 수 없어요.' }
    : { button: '약속 나가기', confirm: '정말 나갈게요', label: '나가면 이 약속에 입력한 내 일정과 출발지가 지워져요. 초대 링크로 다시 들어올 수 있어요.' }

  async function go() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }

  return (
    <section className="mx-auto mt-2 flex w-full max-w-[520px] flex-col gap-2.5 pt-3" aria-label={t.button}>
      {open && <p className="m-0 text-center text-[13px] text-no" role="alert">{t.label}</p>}
      {open ? (
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button className="btn min-h-[48px]" disabled={busy} onClick={() => setOpen(false)}>취소</button>
          <button className="btn min-h-[48px] !bg-no font-bold !text-white hover:opacity-90 disabled:opacity-50" disabled={busy} onClick={go}>
            {busy ? '처리 중…' : t.confirm}
          </button>
        </div>
      ) : (
        <button className="btn min-h-[48px] w-full border border-no !bg-transparent font-bold !text-no hover:!bg-[color-mix(in_oklab,var(--no)_12%,transparent)]" onClick={() => setOpen(true)}>
          {t.button}
        </button>
      )}
    </section>
  )
}
