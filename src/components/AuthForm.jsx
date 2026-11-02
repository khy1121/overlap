import { useState } from 'react'
import { signIn, signUp } from '../lib/auth'

const MAX_BIRTH = new Date().toISOString().slice(0, 10)

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
    if (signup && form.password !== form.confirm) return setError('비밀번호가 서로 달라요.')
    setBusy(true)
    try {
      await (signup ? signUp(form) : signIn(form))
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const label = 'flex flex-col gap-1.5 text-left text-[13px] font-medium text-ink2'
  return (
    <div className="w-full max-w-[420px] rounded-lg bg-sheet p-5 text-left shadow-float sm:p-6">
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
          <input className="field-input" type="date" required min="1900-01-01" max={MAX_BIRTH} value={form.birth} onChange={set('birth')} />
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
