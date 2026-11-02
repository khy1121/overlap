import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useToast } from './hooks/useToast'
import AppBar from './components/AppBar'
import Landing from './components/Landing'
import Home from './components/Home'
import InviteGate from './components/InviteGate'
import Board from './components/Board'
import NewMeeting from './components/NewMeeting'
import MySchedule from './components/MySchedule'
import Friends from './components/Friends'
import Settings from './components/Settings'
import UpdateBanner from './components/UpdateBanner'

const params = new URLSearchParams(window.location.search)
const MID = params.get('m')
// 로그인 후 하위 페이지: /?page=new | schedule | friends | settings
const PAGES = { new: NewMeeting, schedule: MySchedule, friends: Friends, settings: Settings }
const Page = PAGES[params.get('page')]

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = 아직 모름
  const toast = useToast()

  useEffect(() => {
    const err = params.get('error_description')
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      const back = MID ? `/?m=${MID}` : params.get('page') ? `/?${new URLSearchParams({ page: params.get('page'), ...(params.get('kakao_friends') ? { kakao_friends: '1' } : {}) })}` : '/'
      if (params.get('code') || err) window.history.replaceState(null, '', back)
      if (err) toast(/already linked/i.test(err) ? '이 카카오 계정은 이미 다른 Overlap 계정에 연결돼 있어요.' : `로그인하지 못했어요: ${err}`)
      else if (params.get('linked') === 'kakao') {
        window.history.replaceState(null, '', '/')
        toast('카카오 계정을 연결했어요. 이제 카카오로도 로그인할 수 있어요.')
      }
    })
    const { data } = supabase.auth.onAuthStateChange((_ev, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [toast])

  let view
  if (session === undefined) view = <Center>불러오는 중…</Center>
  else if (MID) view = session ? <Board key={MID} mid={MID} session={session} /> : <InviteGate mid={MID} />
  else if (!session) view = <Landing />
  else view = Page ? <Page session={session} /> : <Home session={session} />

  return (
    <div className="wrap">
      <AppBar session={session} />
      <main>{view}</main>
      <UpdateBanner />
    </div>
  )
}

export function Center({ children }) {
  return <div className="grid min-h-[40vh] place-items-center text-center text-ink2">{children}</div>
}
