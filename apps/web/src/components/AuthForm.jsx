import { useState } from 'react'
import {
  checkEmailSignup, sendPasswordReset, signIn, signInEmail, signInWithGoogle, signInWithKakao, signUpEmail,
} from '../lib/auth'

// 생년월일: 달력 대신 숫자로 입력 (8자리 19990315 또는 6자리 990315). 입력하는 동안 1999.03.15처럼 점을 찍어요.
// 날짜 해석·만 나이 계산은 @overlap/core/identity (앱과 같은 규칙)
import { ageOf, dotted, parseBirth } from '@overlap/core/identity'

export { ageOf, parseBirth }

function BirthInput({ value, onChange }) {
  return (
    <input
      className="field-input tabular tracking-wide"
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      required
      maxLength={10}
      placeholder="예: 990315"
      value={value}
      onChange={(e) => {
        const next = e.target.value
        let digits = next.replace(/\D/g, '').slice(0, 8)
        // 점(.)을 지우려고 하면 그 앞 숫자를 지워요
        if (next.length < value.length && digits === value.replace(/\D/g, '')) digits = digits.slice(0, -1)
        onChange(dotted(digits))
      }}
      onBlur={() => {
        const iso = parseBirth(value)
        if (iso) onChange(iso.replaceAll('-', '.'))
      }}
    />
  )
}

/**
 * 로그인·회원가입 (2026-11 새 방식)
 * - 카카오 · Google로 시작하기 (처음이면 자동 가입, 만 14세 확인은 처음 들어올 때 한 번)
 * - 이메일: 로그인 / 회원가입(인증 메일, 만 14세 이상 체크) / 비밀번호 찾기
 * - 이름·생년월일로 가입한 예전 계정: 로그인만 (새 가입은 받지 않아요)
 * hideKakao: 소셜 버튼을 화면에 따로 둔 곳(초대 화면)에서는 이메일 폼만 보여 줘요
 */
export default function AuthForm({ initial = 'login', onDone, hideKakao = false }) {
  // 앱의 '비밀번호를 잊었어요'는 웹의 /?auth=reset 으로 열려요 (재설정은 처음부터 끝까지 같은 브라우저에서 해야 해서)
  const [mode, setMode] = useState(() => (new URLSearchParams(window.location.search).get('auth') === 'reset' ? 'reset' : initial)) // 'login' | 'signup' | 'reset' | 'legacy' | 'sent'
  const [form, setForm] = useState({ email: '', password: '', confirm: '', age14: false, name: '', birth: '' })
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState({ kind: '', email: '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const go = (m) => { setMode(m); setError('') }

  async function run(fn) {
    setError('')
    setBusy(true)
    try {
      await fn()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const social = (fn) => run(fn) // 다른 화면으로 이동해요 (성공하면 돌아오지 않음)

  function submit(e) {
    e.preventDefault()
    if (mode === 'login') return run(async () => { await signInEmail(form); onDone?.() })
    if (mode === 'signup') {
      const bad = checkEmailSignup(form)
      if (bad) return setError(bad)
      return run(async () => {
        const { needsConfirm } = await signUpEmail(form)
        if (needsConfirm) { setSentTo({ kind: 'confirm', email: form.email.trim() }); setMode('sent') } else onDone?.()
      })
    }
    if (mode === 'reset') {
      return run(async () => { await sendPasswordReset(form.email); setSentTo({ kind: 'reset', email: form.email.trim() }); setMode('sent') })
    }
    if (mode === 'legacy') {
      const birth = parseBirth(form.birth)
      if (!birth) return setError('생년월일을 8자리(19990315)나 6자리(990315)로 입력해 주세요.')
      return run(async () => { await signIn({ name: form.name, birth, password: form.password }); onDone?.() })
    }
  }

  const label = 'flex flex-col gap-1.5 text-left text-[13px] font-medium text-ink2'
  const linkBtn = 'border-0 bg-transparent p-0 text-[13px] font-semibold text-accent underline underline-offset-2'

  if (mode === 'sent') {
    return (
      <div className="w-full rounded-[20px] bg-sheet p-5 text-left shadow-soft sm:p-6" role="status">
        <h2 className="m-0 text-[18px] font-bold">메일을 보냈어요</h2>
        <p className="mb-4 mt-2 text-[14px] text-ink2">
          <b className="text-ink">{sentTo.email}</b>로 {sentTo.kind === 'reset' ? '비밀번호 재설정 링크를' : '가입 인증 링크를'} 보냈어요.
          메일의 링크를 누르면 {sentTo.kind === 'reset' ? '새 비밀번호를 정할 수 있어요.' : '가입이 끝나고 바로 시작할 수 있어요.'}
          메일이 안 보이면 스팸함도 확인해 주세요.
        </p>
        <button type="button" className={linkBtn} onClick={() => go('login')}>로그인 화면으로</button>
      </div>
    )
  }

  return (
    <div className="w-full rounded-[20px] bg-sheet p-5 text-left shadow-soft sm:p-6">
      {!hideKakao && mode !== 'legacy' && (
        <>
          <div className="flex flex-col gap-2">
            <KakaoButton onClick={() => social(signInWithKakao)} disabled={busy} />
            <GoogleButton onClick={() => social(signInWithGoogle)} disabled={busy} />
          </div>
          <div className="my-4 flex items-center gap-3 text-[13px] text-ink2">
            <span className="h-px flex-1 bg-rule" />
            또는 이메일로
            <span className="h-px flex-1 bg-rule" />
          </div>
        </>
      )}

      {(mode === 'login' || mode === 'signup') && (
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-rule2 p-1" role="tablist">
          {[['login', '로그인'], ['signup', '회원가입']].map(([k, t]) => (
            <button
              key={k}
              role="tab"
              aria-selected={mode === k}
              className={`min-h-[40px] rounded-full border-0 text-sm font-semibold ${mode === k ? 'bg-sheet text-ink shadow-soft' : 'bg-transparent text-ink2 hover:text-ink'}`}
              onClick={() => go(k)}
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {mode === 'reset' && <h2 className="mb-3 mt-0 text-[17px] font-bold">비밀번호 찾기</h2>}
      {mode === 'legacy' && (
        <div className="mb-3">
          <h2 className="m-0 text-[17px] font-bold">이름·생년월일 계정으로 로그인</h2>
          <p className="mb-0 mt-1 text-[13px] text-ink2">예전에 이름과 생년월일로 가입한 계정이에요. 새 가입은 카카오·Google·이메일로 해 주세요.</p>
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        {mode === 'legacy' ? (
          <>
            <label className={label}>
              이름
              <input className="field-input" required maxLength={20} autoComplete="name" placeholder="홍길동" value={form.name} onChange={set('name')} />
            </label>
            <label className={label}>
              생년월일
              <BirthInput value={form.birth} onChange={(birth) => setForm((f) => ({ ...f, birth }))} />
            </label>
          </>
        ) : (
          <label className={label}>
            이메일
            <input className="field-input" type="email" required autoComplete="email" inputMode="email" placeholder="name@example.com" value={form.email} onChange={set('email')} />
          </label>
        )}

        {mode !== 'reset' && (
          <label className={label}>
            비밀번호
            <input
              className="field-input"
              type="password"
              required
              minLength={mode === 'signup' ? 8 : 6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              placeholder={mode === 'signup' ? '8자 이상' : ''}
              value={form.password}
              onChange={set('password')}
            />
          </label>
        )}
        {mode === 'signup' && (
          <>
            <label className={label}>
              비밀번호 확인
              <input className="field-input" type="password" required minLength={8} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
            </label>
            <label className="flex items-center gap-2 text-[14px] font-medium text-ink">
              <input type="checkbox" checked={form.age14} onChange={set('age14')} />
              만 14세 이상이에요
            </label>
          </>
        )}

        {error && <div className="rounded-md bg-no-soft px-4 py-3 text-[13px] text-ink" role="alert">{error}</div>}
        <button className="btn-primary btn-lg mt-1" type="submit" disabled={busy}>
          {busy ? '잠시만요…' : { login: '로그인', signup: '인증 메일 받고 가입하기', reset: '재설정 링크 받기', legacy: '로그인' }[mode]}
        </button>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {mode === 'login' && <button type="button" className={linkBtn} onClick={() => go('reset')}>비밀번호를 잊었어요</button>}
          {(mode === 'reset' || mode === 'legacy') && <button type="button" className={linkBtn} onClick={() => go('login')}>← 이메일 로그인으로</button>}
          {mode !== 'legacy' && <button type="button" className="ml-auto border-0 bg-transparent p-0 text-[13px] text-ink2 underline underline-offset-2" onClick={() => go('legacy')}>이름·생년월일로 가입한 계정이에요</button>}
        </div>
        <p className="small m-0">
          {mode === 'signup' ? '가입하면' : '로그인하면'} <a href="/?page=terms" className="font-semibold text-accent underline underline-offset-2">이용약관</a>과 <a href="/?page=privacy" className="font-semibold text-accent underline underline-offset-2">개인정보처리방침</a>에 동의하는 것으로 봐요.
        </p>
      </form>
    </div>
  )
}

/** 카카오 로그인 버튼 (카카오 디자인 가이드: #FEE500 배경, 검정 말풍선 심볼, 85% 검정 글자) */
export function KakaoButton({ onClick, disabled, label = '카카오로 시작하기' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border-0 bg-kakao text-[15px] font-semibold text-black/85 hover:bg-kakao-hover"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#000" d="M12 3C6.48 3 2 6.48 2 10.78c0 2.78 1.86 5.22 4.66 6.6l-.95 3.48c-.08.3.26.54.52.37l4.15-2.74c.53.07 1.07.11 1.62.11 5.52 0 10-3.48 10-7.82S17.52 3 12 3Z" />
      </svg>
      {label}
    </button>
  )
}

/** Google 로그인 버튼 (Google 브랜드 가이드: 흰 배경, 회색 테두리, 4색 G 로고) */
export function GoogleButton({ onClick, disabled, label = 'Google로 시작하기' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] border border-solid border-[#dadce0] bg-white text-[15px] font-semibold text-[#1f1f1f] hover:bg-[#f8f9fa]"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {label}
    </button>
  )
}
