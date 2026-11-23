import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { displayName, hasKakao } from '../lib/auth'
import { KINDS, disablePush, enablePush, loadPrefs, pushState, savePrefs, sendTestPush } from '../lib/push'
import { useToast } from '../hooks/useToast'
import PageHeader from './PageHeader'
import ThemeToggle from './ThemeToggle'
import KakaoLink from './KakaoLink'
import InstallApp from './InstallApp'

/** 켜기/끄기 스위치 */
function Switch({ on, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`flex h-[30px] w-[50px] shrink-0 items-center justify-start rounded-full border-0 p-[3px] transition-colors active:!scale-100 ${on ? 'bg-pen-strong' : 'bg-rule'}`}
    >
      {/* 동그라미는 안쪽 여백(3px) 안에서만 움직여요: 꺼짐 = 왼쪽, 켜짐 = 오른쪽(50 - 3·2 - 24 = 20px 이동) */}
      <span className={`block h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,.25)] transition-transform duration-200 ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  )
}

const Row = ({ title, desc, children, compact = false }) => (
  <div className={`flex items-center gap-3 border-b border-rule2 last:border-0 ${compact ? 'min-h-[48px] py-2' : 'py-3'}`}>
    <div className="min-w-0 flex-1">
      <div className="text-[15px] font-semibold">{title}</div>
      {desc && <div className="text-[13px] text-ink2">{desc}</div>}
    </div>
    {children}
  </div>
)

/** 한 줄 링크 행 (오른쪽 화살표) */
const LinkRow = ({ href, title, badge }) => (
  <a href={href} className="flex min-h-[48px] items-center gap-3 border-b border-rule2 py-2.5 text-ink no-underline last:border-0">
    <span className="min-w-0 flex-1 text-[15px] font-semibold">{title}</span>
    {badge}
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
  </a>
)

const PUSH_NOTE = {
  unsupported: '이 브라우저는 알림을 지원하지 않아요. Chrome·삼성 인터넷·Safari(홈 화면 앱)에서 열어 주세요.',
  'ios-install': '아이폰은 Safari에서 홈 화면에 앱을 설치한 뒤, 설치한 앱에서 알림을 켤 수 있어요.',
  dev: '개발 서버에서는 알림을 켤 수 없어요. 배포된 사이트에서 사용해 주세요.',
  denied: '알림이 차단돼 있어요. 브라우저(또는 휴대폰) 설정에서 이 사이트의 알림을 허용해 주세요.',
}

/** 설정 페이지 (/?page=settings) */
export default function Settings({ session }) {
  const toast = useToast()
  const user = session.user
  const [name, setName] = useState(displayName(user))
  const [savedName, setSavedName] = useState(displayName(user))
  const [push, setPush] = useState(null) // pushState 결과
  const [prefs, setPrefs] = useState(null)
  const [busy, setBusy] = useState(false)
  const [inboxNew, setInboxNew] = useState(null) // 관리자면 새 의견 수, 아니면 null
  const nameLogin = user.identities?.some((i) => i.provider === 'email')

  useEffect(() => {
    pushState().then(setPush).catch(() => setPush('unsupported'))
    loadPrefs().then(setPrefs)
    // 관리자에게만 의견함 메뉴 (서버가 관리자인지 확인)
    supabase.rpc('is_app_admin').then(async ({ data }) => {
      if (data !== true) return
      const { data: c } = await supabase.rpc('admin_feedback_counts')
      setInboxNew(Number((c || []).find((r) => r.status === 'new')?.n || 0))
    })
    supabase.rpc('my_profile').then(({ data }) => {
      const n = data?.[0]?.name
      if (n) { setName(n); setSavedName(n) }
    })
  }, [])

  async function saveName(e) {
    e.preventDefault()
    const v = name.trim().replace(/\s+/g, ' ')
    if (!v || [...v].length > 20) return toast('이름은 1~20자로 입력해 주세요.')
    setBusy(true)
    const { data, error } = await supabase.rpc('update_my_name', { new_name: v })
    if (!error) await supabase.auth.updateUser({ data: { full_name: data } })
    setBusy(false)
    if (error) return toast(/function/i.test(error.message) ? '이름 변경 기능이 아직 서버에 준비되지 않았어요.' : '이름을 바꾸지 못했어요.')
    setName(data)
    setSavedName(data)
    toast('이름을 바꿨어요')
  }

  async function togglePush(on) {
    setBusy(true)
    try {
      if (on) await enablePush()
      else await disablePush()
      setPush(await pushState())
      toast(on ? '이 기기에서 알림을 받아요' : '이 기기의 알림을 껐어요')
    } catch (e) {
      toast(e.message)
      setPush(await pushState().catch(() => 'off'))
    } finally {
      setBusy(false)
    }
  }

  async function toggleKind(key, on) {
    const next = { ...prefs, [key]: on }
    setPrefs(next)
    try {
      await savePrefs(next)
    } catch (e) {
      setPrefs(prefs)
      toast(e.message)
    }
  }

  async function test() {
    setBusy(true)
    try {
      await sendTestPush()
      toast('테스트 알림을 보냈어요')
    } catch (e) {
      toast(e.message)
    } finally {
      setBusy(false)
    }
  }

  const pushOn = push === 'on'
  const h2 = 'm-0 mb-1 text-[13px] font-semibold text-ink2'
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
      <PageHeader title="설정" />

      {/* 프로필: 이름 입력 한 줄 */}
      <form className="sheet flex flex-col gap-1.5 !py-3" onSubmit={saveName}>
        <label htmlFor="my-name" className="text-[13px] font-semibold text-ink2">표시 이름{hasKakao(user) ? ' · 카카오 연결됨' : ''}</label>
        <div className="flex gap-2">
          <input id="my-name" className="field-input min-w-0 flex-1" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary min-h-[48px]" type="submit" disabled={busy || !name.trim() || name.trim() === savedName}>저장</button>
        </div>
        {nameLogin && <p className="m-0 text-[12px] text-ink2">로그인할 때는 가입할 때 쓴 이름을 그대로 입력해 주세요.</p>}
      </form>

      <section>
        <h2 className={h2}>알림</h2>
        <div className="sheet !py-1">
          <Row title="이 기기에서 알림 받기" desc={push === 'on' ? '켜져 있어요' : push === 'off' ? '꺼져 있어요' : push ? '사용할 수 없어요' : '확인하는 중…'}>
            <Switch label="이 기기에서 알림 받기" on={pushOn} disabled={busy || !['on', 'off'].includes(push)} onChange={togglePush} />
          </Row>
          {PUSH_NOTE[push] && <p className="m-0 mb-2 rounded-[12px] bg-rule2 px-3.5 py-2.5 text-[13px] text-ink2">{PUSH_NOTE[push]}</p>}
          {KINDS.map((k) => (
            <Row key={k.key} title={k.label} desc={k.desc} compact>
              <Switch label={k.label} on={prefs ? prefs[k.key] : true} disabled={!prefs} onChange={(on) => toggleKind(k.key, on)} />
            </Row>
          ))}
          {pushOn && (
            <div className="py-2.5">
              <button className="btn-soft w-full" onClick={test} disabled={busy}>테스트 알림 보내기</button>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className={h2}>화면 · 계정</h2>
        <div className="sheet !py-1">
          <Row title="테마" compact>
            <ThemeToggle />
          </Row>
          {inboxNew !== null && (
            <LinkRow
              href="/?page=inbox"
              title="의견함 (관리자)"
              badge={inboxNew > 0 ? <span className="rounded-full bg-no px-2 text-[12px] font-bold leading-5 text-white">{inboxNew}</span> : null}
            />
          )}
          <LinkRow href="/?page=feedback" title="의견 보내기" />
          <LinkRow href="/?page=privacy" title="개인정보처리방침" />
          <button
            type="button"
            className="flex min-h-[48px] w-full items-center border-0 bg-transparent py-2.5 text-left text-[15px] font-semibold text-ink"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
          >
            로그아웃
          </button>
        </div>
      </section>

      {!hasKakao(user) && <KakaoLink user={user} />}
      <InstallApp />

      <Withdraw />
    </div>
  )
}

/** 회원 탈퇴: '탈퇴'를 직접 입력해야 진행돼요 */
function Withdraw() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function withdraw() {
    setBusy(true)
    const { error } = await supabase.functions.invoke('delete-account', { body: { confirm: text.trim() } })
    if (error) {
      setBusy(false)
      let message = '탈퇴를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'
      try { message = (await error.context.json())?.message || message } catch { /* 본문 없음 */ }
      if (error.context?.status === 404) message = '탈퇴 기능이 아직 서버에 준비되지 않았어요.'
      return toast(message)
    }
    await supabase.auth.signOut().catch(() => {})
    window.location.href = '/'
  }

  return (
    <section aria-label="회원 탈퇴">
      {/* 평소엔 맨 아래 작은 글자 하나, 누르면 안내와 확인 입력이 펼쳐져요 */}
      <div className={open ? 'sheet flex flex-col gap-3' : 'flex justify-center'}>
        {!open ? (
          <button className="btn-ghost btn-sm text-ink2 hover:text-no" onClick={() => setOpen(true)}>회원 탈퇴</button>
        ) : (
          <>
            <ul className="m-0 flex flex-col gap-1 pl-5 text-[14px]">
              <li>프로필, 입력한 시간, 친구·친구 신청, 알림 설정이 <b>바로 삭제되고 되돌릴 수 없어요.</b></li>
              <li>내가 만든 약속은 다른 참여자에게 넘어가고, 혼자인 약속은 삭제돼요.</li>
              <li>카카오로 가입했다면 카카오 계정 설정의 ‘연결된 서비스 관리’에서 연결도 끊을 수 있어요.</li>
            </ul>
            <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink2">
              계속하려면 ‘탈퇴’를 입력해 주세요
              <input className="field-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="탈퇴" />
            </label>
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={() => { setOpen(false); setText('') }} disabled={busy}>취소</button>
              <button className="btn flex-1 bg-no text-white hover:bg-no" onClick={withdraw} disabled={busy || text.trim() !== '탈퇴'}>
                {busy ? '처리 중…' : '탈퇴하기'}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
