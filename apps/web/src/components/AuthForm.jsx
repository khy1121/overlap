import { useState } from 'react'
import { signIn, signInWithKakao, signUp } from '../lib/auth'

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

// hideKakao: 카카오 버튼을 화면에 따로 둔 곳(초대 화면)에서는 이름·생년월일 폼만 보여 줘요
export default function AuthForm({ initial = 'login', onDone, hideKakao = false }) {
  const [tab, setTab] = useState(initial)
  const [form, setForm] = useState({ name: '', birth: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const signup = tab === 'signup'

  async function submit(e) {
    e.preventDefault()
    setError('')
    const birth = parseBirth(form.birth)
    if (!birth) return setError('생년월일을 8자리(19990315)나 6자리(990315)로 입력해 주세요.')
    if (signup && ageOf(birth) < 14) return setError('만 14세 이상만 가입할 수 있어요.')
    if (signup && form.password !== form.confirm) return setError('비밀번호가 서로 달라요.')
    setBusy(true)
    try {
      await (signup ? signUp({ ...form, birth }) : signIn({ ...form, birth }))
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function kakao() {
    setError('')
    setBusy(true)
    try {
      await signInWithKakao() // 카카오 로그인 화면으로 이동해요
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const label = 'flex flex-col gap-1.5 text-left text-[13px] font-medium text-ink2'
  return (
    <div className="w-full rounded-[20px] bg-sheet p-5 text-left shadow-soft sm:p-6">
      {!hideKakao && (
        <>
          <KakaoButton onClick={kakao} disabled={busy} />
          <div className="my-4 flex items-center gap-3 text-[13px] text-ink2">
            <span className="h-px flex-1 bg-rule" />
            또는 이름·생년월일로
            <span className="h-px flex-1 bg-rule" />
          </div>
        </>
      )}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-rule2 p-1" role="tablist">
        {[['login', '로그인'], ['signup', '회원가입']].map(([k, t]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            className={`min-h-[40px] rounded-full border-0 text-sm font-semibold ${tab === k ? 'bg-sheet text-ink shadow-soft' : 'bg-transparent text-ink2 hover:text-ink'}`}
            onClick={() => { setTab(k); setError('') }}
          >
            {t}
          </button>
        ))}
      </div>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <label className={label}>
          이름
          <input className="field-input" required maxLength={20} autoComplete="name" placeholder="홍길동" value={form.name} onChange={set('name')} />
        </label>
        <label className={label}>
          생년월일
          <BirthInput value={form.birth} onChange={(birth) => setForm((f) => ({ ...f, birth }))} />
        </label>
        <label className={label}>
          비밀번호
          <input
            className="field-input"
            type="password"
            required
            minLength={6}
            autoComplete={signup ? 'new-password' : 'current-password'}
            placeholder={signup ? '6자 이상' : ''}
            value={form.password}
            onChange={set('password')}
          />
        </label>
        {signup && (
          <label className={label}>
            비밀번호 확인
            <input className="field-input" type="password" required minLength={6} autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
          </label>
        )}
        {error && <div className="rounded-md bg-no-soft px-4 py-3 text-[13px] text-ink" role="alert">{error}</div>}
        <button className="btn-primary btn-lg mt-1" type="submit" disabled={busy}>
          {busy ? '잠시만요…' : signup ? '가입하고 시작하기' : '로그인'}
        </button>
        <p className="small m-0">
          {signup
            ? '이름과 생년월일이 같은 계정은 하나만 만들 수 있어요. 생년월일은 로그인 확인에만 쓰고 그대로 저장하지 않아요. 만 14세 이상만 가입할 수 있어요.'
            : '비밀번호를 잊으면 되찾을 수 없어요. 가입할 때 쓴 이름과 생년월일을 그대로 입력해 주세요.'}
        </p>
        <p className="small m-0">
          {signup ? '가입하면' : '로그인하면'} <a href="/?page=privacy" className="font-semibold text-accent underline underline-offset-2">개인정보처리방침</a>에 따라 정보를 처리하는 데 동의하는 것으로 봐요.
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
