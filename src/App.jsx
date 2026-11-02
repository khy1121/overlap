import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useToast } from './hooks/useToast'
import AppBar from './components/AppBar'
import Landing from './components/Landing'
import Home from './components/Home'
import InviteGate from './components/InviteGate'
import Board from './components/Board'

const params = new URLSearchParams(window.location.search)
const MID = params.get('m')

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = 아직 모름
  const toast = useToast()

  useEffect(() => {
    const err = params.get('error_description')
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (params.get('code') || err) window.history.replaceState(null, '', MID ? `/?m=${MID}` : '/')
      if (err) toast(`로그인하지 못했어요: ${err}`)
    })
    const { data } = supabase.auth.onAuthStateChange((_ev, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [toast])

  let view
  if (session === undefined) view = <Center>불러오는 중…</Center>
  else if (MID) view = session ? <Board key={MID} mid={MID} session={session} /> : <InviteGate mid={MID} />
  else view = session ? <Home session={session} /> : <Landing />

  return (
    <div className="wrap">
      <AppBar session={session} />
      <main>{view}</main>
    </div>
  )
}

export function Center({ children }) {
  return <div className="grid min-h-[40vh] place-items-center text-center text-ink2">{children}</div>
}
