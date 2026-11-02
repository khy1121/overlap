import { useState } from 'react'
import { signIn, signUp } from '../lib/auth'

// 생년월일: 달력 대신 숫자로 입력 (8자리 19990315 또는 6자리 990315). 입력하는 동안 1999.03.15처럼 점을 찍어요.
const dotted = (digits) => [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('.')

/** 입력값 → 'YYYY-MM-DD' (잘못된 날짜면 null) */
export function parseBirth(value) {
  let d = value.replace(/\D/g, '')
  if (d.length === 6) {
    const yy = Number(d.slice(0, 2))
    const now = new Date().getFullYear() % 100
    d = `${yy > now ? 19 : 20}${d}`
  }
  if (d.length !== 8) return null
  const [y, m, day] = [Number(d.slice(0, 4)), Number(d.slice(4, 6)), Number(d.slice(6, 8))]
  const date = new Date(y, m - 1, day)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== day) return null
  if (y < 1900 || date > new Date()) return null
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

function BirthInput({ value, onChange }) {
  return (
    <input
      className="field-input tabular tracking-wide"
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      required
      maxLength={10}
      placeholder="예: 19990315 또는 990315"
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

export default function AuthForm({ initial = 'login', onDone }) {
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

  const label = 'flex flex-col gap-1.5 text-left text-[13px] font-medium text-ink2'
  return (
    <div className="w-full rounded-[20px] bg-sheet p-5 text-left shadow-soft sm:p-6">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-full bg-rule2 p-1" role="tablist">
        {[['login', '로그인'], ['signup', '처음이에요 (가입)']].map(([k, t]) => (
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
            ? '이름과 생년월일이 같은 계정은 하나만 만들 수 있어요. 생년월일은 로그인 확인에만 쓰고 그대로 저장하지 않아요.'
            : '비밀번호를 잊으면 되찾을 수 없어요. 가입할 때 쓴 이름과 생년월일을 그대로 입력해 주세요.'}
        </p>
      </form>
    </div>
  )
}
