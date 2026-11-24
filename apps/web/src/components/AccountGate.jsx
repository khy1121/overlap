import { useState } from 'react'
import { deleteAccount } from '@overlap/core/api/profile'
import { confirmAge14, updatePassword } from '../lib/auth'
import { supabase } from '../lib/supabase'

/**
 * 만 14세 이상 확인 (Google·카카오로 처음 들어온 계정, 한 번만).
 * 아니라고 하면 개인정보보호법에 따라 방금 만든 계정 정보를 지우고 나가요.
 */
export function Age14Gate({ onDone }) {
  const [step, setStep] = useState('ask') // 'ask' | 'under'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function run(fn) {
    setBusy(true)
    setError('')
    try { await fn() } catch (e) { setError(e.message); setBusy(false) }
  }
  return (
    <section className="sheet mx-auto mt-8 flex max-w-[460px] flex-col gap-3">
      {step === 'ask' ? (
        <>
          <h1 className="m-0 text-[22px] font-extrabold">시작하기 전에 한 가지만요</h1>
          <p className="m-0 text-[15px] text-ink2">Overlap은 만 14세 이상만 쓸 수 있어요. 생년월일은 받지 않아요.</p>
          {error && <p className="m-0 text-[13px] text-no" role="alert">{error}</p>}
          <button className="btn-primary btn-lg" disabled={busy} onClick={() => run(async () => { await confirmAge14(); onDone?.() })}>네, 만 14세 이상이에요</button>
          <button className="btn-ghost btn-sm self-center" disabled={busy} onClick={() => setStep('under')}>아니에요</button>
        </>
      ) : (
        <>
          <h1 className="m-0 text-[22px] font-extrabold">아쉽지만 지금은 쓸 수 없어요</h1>
          <p className="m-0 text-[15px] text-ink2">만 14세 미만은 보호자 동의가 필요해서 가입할 수 없어요. 방금 만들어진 계정 정보는 바로 지울게요.</p>
          {error && <p className="m-0 text-[13px] text-no" role="alert">{error}</p>}
          <button className="btn-primary btn-lg" disabled={busy} onClick={() => run(async () => { await deleteAccount(supabase, '탈퇴'); window.location.replace('/') })}>
            {busy ? '지우는 중…' : '계정 정보 지우고 나가기'}
          </button>
          <button className="btn-ghost btn-sm self-center" disabled={busy} onClick={() => setStep('ask')}>잘못 눌렀어요</button>
        </>
      )}
    </section>
  )
}

/** 비밀번호 재설정 링크로 들어왔을 때: 새 비밀번호 정하기 */
export function NewPassword({ onDone }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    if (pw !== pw2) return setError('비밀번호가 서로 달라요.')
    setBusy(true)
    setError('')
    try {
      await updatePassword(pw)
      onDone?.()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }
  return (
    <form className="sheet mx-auto mt-8 flex max-w-[460px] flex-col gap-4" onSubmit={submit}>
      <h1 className="m-0 text-[22px] font-extrabold">새 비밀번호 정하기</h1>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink2">
        새 비밀번호
        <input className="field-input" type="password" required minLength={8} autoComplete="new-password" placeholder="8자 이상" value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink2">
        새 비밀번호 확인
        <input className="field-input" type="password" required minLength={8} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </label>
      {error && <div className="rounded-md bg-no-soft px-4 py-3 text-[13px] text-ink" role="alert">{error}</div>}
      <button className="btn-primary btn-lg" type="submit" disabled={busy}>{busy ? '저장 중…' : '비밀번호 바꾸기'}</button>
    </form>
  )
}
