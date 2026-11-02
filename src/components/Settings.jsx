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
      className={`relative h-[30px] w-[50px] shrink-0 rounded-full border-0 p-0 transition-colors ${on ? 'bg-pen-strong' : 'bg-rule'}`}
    >
      <span className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-soft transition-transform ${on ? 'translate-x-[23px]' : 'translate-x-[3px]'}`} />
    </button>
  )
}

const Row = ({ title, desc, children }) => (
  <div className="flex items-center gap-3 border-b border-rule2 py-3.5 last:border-0">
    <div className="min-w-0 flex-1">
      <div className="text-[15px] font-semibold">{title}</div>
      {desc && <div className="text-[13px] text-ink2">{desc}</div>}
    </div>
    {children}
  </div>
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
  const nameLogin = user.identities?.some((i) => i.provider === 'email')

  useEffect(() => {
    pushState().then(setPush).catch(() => setPush('unsupported'))
    loadPrefs().then(setPrefs)
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
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-5">
      <PageHeader title="설정" />

      <section>
        <h2 className={h2}>프로필</h2>
        <form className="sheet flex flex-col gap-2" onSubmit={saveName}>
          <label htmlFor="my-name" className="text-[15px] font-semibold">표시 이름</label>
          <div className="flex gap-2">
            <input id="my-name" className="field-input min-w-0 flex-1" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn-primary min-h-[48px]" type="submit" disabled={busy || !name.trim() || name.trim() === savedName}>저장</button>
          </div>
          <p className="m-0 text-[13px] text-ink2">
            친구 목록과 약속 참여자 목록에 보이는 이름이에요.
            {nameLogin && ' 이름·생년월일로 로그인할 때는 가입할 때 쓴 이름을 그대로 입력해 주세요.'}
          </p>
        </form>
      </section>

      <section>
        <h2 className={h2}>알림</h2>
        <div className="sheet !py-1">
          <Row title="이 기기에서 알림 받기" desc={push === 'on' ? '켜져 있어요' : push === 'off' ? '꺼져 있어요' : push ? '사용할 수 없어요' : '확인하는 중…'}>
            <Switch label="이 기기에서 알림 받기" on={pushOn} disabled={busy || !['on', 'off'].includes(push)} onChange={togglePush} />
          </Row>
          {PUSH_NOTE[push] && <p className="m-0 mb-3 rounded-[12px] bg-rule2 px-3.5 py-2.5 text-[13px] text-ink2">{PUSH_NOTE[push]}</p>}
          {KINDS.map((k) => (
            <Row key={k.key} title={k.label} desc={k.desc}>
              <Switch label={k.label} on={prefs ? prefs[k.key] : true} disabled={!prefs} onChange={(on) => toggleKind(k.key, on)} />
            </Row>
          ))}
          {pushOn && (
            <div className="py-3">
              <button className="btn-soft w-full" onClick={test} disabled={busy}>테스트 알림 보내기</button>
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className={h2}>화면</h2>
        <div className="sheet !py-1">
          <Row title="테마" desc="시스템 설정을 따르거나 라이트·다크를 골라요">
            <ThemeToggle />
          </Row>
        </div>
      </section>

      <section>
        <h2 className={h2}>계정</h2>
        <div className="flex flex-col gap-3">
          {hasKakao(user) ? (
            <div className="sheet !py-1">
              <Row title="카카오 계정" desc="연결돼 있어요. 카카오로도 로그인할 수 있어요." />
            </div>
          ) : (
            <KakaoLink user={user} />
          )}
          <InstallApp />
          <button
            className="btn-ghost self-start text-no hover:text-no"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
          >
            로그아웃
          </button>
        </div>
      </section>
    </div>
  )
}
