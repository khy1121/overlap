import { useEffect, useState } from 'react'
import { signInWithKakao } from '../lib/auth'
import { DAYS, durText } from '../lib/schedule'
import { supabase } from '../lib/supabase'
import AuthForm, { KakaoButton } from './AuthForm'

/**
 * 초대 링크로 들어온 로그인 전 화면.
 * 약속 요약 한 장 + 아래 고정 [카카오로 바로 참여하기]. 이름·생년월일 가입은 눌러야 펼쳐져요.
 */
export default function InviteGate({ mid }) {
  const [info, setInfo] = useState(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.rpc('meeting_preview', { mid }).then(({ data, error }) => setInfo(error ? null : data?.[0] || null))
  }, [mid])

  async function kakao() {
    setError('')
    setBusy(true)
    try {
      await signInWithKakao() // 카카오 로그인 화면으로 갔다가 이 약속 링크로 돌아와요
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (info === undefined) return <div className="grid min-h-[40vh] place-items-center text-ink2">불러오는 중…</div>

  if (!info) {
    return (
      <section className="sheet mx-auto mt-6 max-w-[460px]">
        <h1 className="mb-1 font-display text-[28px] font-extrabold">약속을 찾을 수 없어요</h1>
        <p className="small">링크가 정확한지 확인하거나, 약속을 만든 사람에게 새 링크를 받아 주세요.</p>
      </section>
    )
  }

  // 기간·시간대 한 줄 (DB 함수가 새 칸을 아직 안 돌려주면 시작일만)
  const [y, mo, d0] = info.start_date.split('-').map(Number)
  const day = (i) => { const t = new Date(y, mo - 1, d0 + i); return `${t.getMonth() + 1}/${t.getDate()}(${DAYS[t.getDay()]})` }
  const days = info.days || 0
  const rangeText = days
    ? [
        days > 1 ? `${day(0)}–${day(days - 1)}` : day(0),
        `${days > 1 ? '매일 ' : ''}${info.from_hour}–${info.to_hour}시`,
        info.dur !== undefined ? durText(info.dur) : null,
      ].filter(Boolean).join(' · ')
    : `${mo}월 ${d0}일부터`
  return (
    <section className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-3 pb-44 pt-8 text-center">
      <p className="m-0 text-[15px] text-ink2">{info.host_name ? `${info.host_name}님이 약속에 초대했어요` : '약속에 초대받았어요'}</p>
      <h1 className="m-0 text-balance font-display text-[30px] font-extrabold leading-tight tracking-[-.02em]">{info.title}</h1>
      <div className="sheet mt-2 flex w-full flex-col gap-2.5 text-left">
        <span className="flex items-center gap-2.5 text-[15px] font-semibold">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink2" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
          {rangeText}
        </span>
        <span className="flex items-center gap-2.5 text-[15px] font-semibold">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink2" aria-hidden="true"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></svg>
          지금 {info.joined}명 참여 중
        </span>
      </div>
      <p className="m-0 text-[13px] text-ink2">되는 시간만 칠하면, 모두 되는 시간은 Overlap이 찾아 드려요.</p>
      {formOpen && <div className="mt-2 w-full"><AuthForm initial="signup" hideKakao /></div>}

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-[color-mix(in_oklab,var(--sheet)_94%,transparent)] px-4 pt-3 backdrop-blur"
        style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex max-w-[460px] flex-col gap-1.5">
          {error && <p className="m-0 text-[13px] text-no" role="alert">{error}</p>}
          <KakaoButton onClick={kakao} disabled={busy} label="카카오로 바로 참여하기" />
          <button type="button" className="min-h-[40px] border-0 bg-transparent text-[13px] font-semibold text-ink2" aria-expanded={formOpen} onClick={() => setFormOpen((o) => !o)}>
            {formOpen ? '접기' : '이름·생년월일로 가입 · 로그인'}
          </button>
        </div>
      </div>
    </section>
  )
}
