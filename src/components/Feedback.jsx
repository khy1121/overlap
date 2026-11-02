import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import PageHeader from './PageHeader'

const KINDS = [
  { key: 'bug', label: '🐞 버그 신고', hint: '어떤 화면에서, 무엇을 눌렀을 때, 어떻게 됐는지 적어 주세요.' },
  { key: 'idea', label: '💡 개선 아이디어', hint: '있으면 좋겠는 기능이나 불편했던 점을 알려 주세요.' },
  { key: 'etc', label: '💬 기타', hint: '무엇이든 편하게 남겨 주세요.' },
]

// 함께 보내는 정보: 보내기 직전 화면, 앱 버전(앱 파일 이름), 브라우저
function context() {
  let page = ''
  try {
    const ref = document.referrer ? new URL(document.referrer) : null
    if (ref && ref.origin === window.location.origin) page = ref.pathname + ref.search
  } catch {
    /* 무시 */
  }
  const entry = document.querySelector('script[type="module"][src*="/assets/index-"]')
  return {
    page: page || '(알 수 없음)',
    version: entry ? new URL(entry.src).pathname.replace('/assets/', '') : 'dev',
    ua: navigator.userAgent.slice(0, 300),
  }
}

const ERRORS = {
  'too short': '내용을 5자 이상 적어 주세요.',
  'too long': '내용은 2000자까지 적을 수 있어요.',
  'rate limited': '잠시 후 다시 보내 주세요. (짧은 시간에 너무 많이 보냈어요)',
}

/** 의견 보내기 (/?page=feedback) */
export default function Feedback() {
  const toast = useToast()
  const [kind, setKind] = useState('bug')
  const [message, setMessage] = useState('')
  const [anonymous, setAnonymous] = useState(false)
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const ctx = context()
  const current = KINDS.find((k) => k.key === kind)

  async function submit(e) {
    e.preventDefault()
    if (message.trim().length < 5) return toast(ERRORS['too short'])
    setBusy(true)
    const { error } = await supabase.rpc('submit_feedback', {
      p_kind: kind,
      p_message: message.trim(),
      p_anonymous: anonymous,
      p_page: ctx.page,
      p_version: ctx.version,
      p_ua: ctx.ua,
    })
    setBusy(false)
    if (error) {
      const key = Object.keys(ERRORS).find((k) => error.message.includes(k))
      return toast(key ? ERRORS[key] : /function/i.test(error.message) ? '의견 보내기가 아직 서버에 준비되지 않았어요.' : '보내지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
        <PageHeader title="의견 보내기" />
        <section className="sheet flex flex-col items-start gap-3">
          <div className="text-[20px] font-bold">고마워요! 🙌</div>
          <p className="m-0 text-[15px] text-ink2">보내 주신 내용은 꼼꼼히 읽고 서비스를 고치는 데 쓸게요.</p>
          <div className="flex gap-2">
            <button className="btn-soft" onClick={() => { setSent(false); setMessage('') }}>하나 더 보내기</button>
            <a href="/" className="btn no-underline">홈으로</a>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <PageHeader title="의견 보내기" sub="버그나 고치면 좋을 점을 알려 주세요. 하나하나 읽어요." />
      <form className="sheet flex flex-col gap-4" onSubmit={submit}>
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="종류">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              role="radio"
              aria-checked={kind === k.key}
              onClick={() => setKind(k.key)}
              className={`min-h-[40px] rounded-[12px] border-0 px-3.5 text-sm font-semibold ${kind === k.key ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`}
            >
              {k.label}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink2">
          내용
          <textarea
            className="field-input min-h-[160px] resize-y leading-relaxed"
            maxLength={2000}
            placeholder={current.hint}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <span className="self-end text-[12px] text-ink2">{message.length}/2000</span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-[12px] bg-rule2 px-3.5 py-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--pen-strong)]" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          <span className="text-[14px]">
            <b>익명으로 보내기</b>
            <span className="block text-[13px] text-ink2">체크하면 내 계정 정보를 함께 저장하지 않아요. 대신 답변을 드릴 수 없어요.</span>
          </span>
        </label>

        <p className="m-0 text-[12px] leading-relaxed text-ink2">
          문제를 찾기 위해 보낸 화면({ctx.page}), 앱 버전, 브라우저 정보를 함께 저장해요. 자세한 내용은{' '}
          <a href="/?page=privacy" className="text-accent underline underline-offset-2">개인정보처리방침</a>을 확인해 주세요.
        </p>

        <button className="btn-primary btn-lg" type="submit" disabled={busy || message.trim().length < 5}>
          {busy ? '보내는 중…' : '보내기'}
        </button>
      </form>
    </div>
  )
}
