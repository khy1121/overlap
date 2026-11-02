import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const PERSON_COLS = 'id,user_id,name,avatar_url,cells,created_at'
const CFG_COLS = { title: 'title', start: 'start_date', from: 'from_hour', to: 'to_hour', dur: 'dur', count: 'expected', picked: 'picked' }

const fromRow = (m) => ({
  title: m.title, start: m.start_date, from: m.from_hour, to: m.to_hour,
  dur: m.dur, count: m.expected, picked: m.picked, owner: m.owner,
})
const toPerson = (r) => ({
  id: r.id, user_id: r.user_id, name: r.name || '', avatar_url: r.avatar_url, cells: r.cells || {}, created_at: r.created_at,
})

/**
 * 회의 하나를 불러와서 실시간으로 맞춰 둔다.
 * 로그인한 사용자를 참여자로 등록(join_meeting)한 뒤 회의와 참여자를 읽고, 변경을 구독한다.
 */
export function useMeeting(mid, onError) {
  const [state, setState] = useState({ status: 'loading', error: null })
  const [cfg, setCfg] = useState(null)
  const [people, setPeople] = useState([])
  const [myPid, setMyPid] = useState(null)
  const [live, setLive] = useState('connecting')
  const pending = useRef({}) // 내가 저장 중인 참여자: 그 사이 도착한 메아리는 무시
  const errRef = useRef(onError)
  errRef.current = onError

  useEffect(() => {
    let channel
    let cancelled = false
    ;(async () => {
      const joined = await supabase.rpc('join_meeting', { mid })
      if (cancelled) return
      if (joined.error) {
        setState({ status: 'error', error: /not found/.test(joined.error.message) ? 'not_found' : joined.error.message })
        return
      }
      const [m, ps] = await Promise.all([
        supabase.from('meetings').select('*').eq('id', mid).single(),
        supabase.from('participants').select(PERSON_COLS).eq('meeting_id', mid).order('created_at'),
      ])
      if (cancelled) return
      if (m.error || ps.error) {
        setState({ status: 'error', error: (m.error || ps.error).message })
        return
      }
      setMyPid(joined.data)
      setCfg(fromRow(m.data))
      setPeople(ps.data.map(toPerson))
      setState({ status: 'ready', error: null })

      channel = supabase
        .channel(`meeting-${mid}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `meeting_id=eq.${mid}` }, (pl) => {
          if (pl.eventType === 'DELETE') {
            setPeople((list) => list.filter((p) => p.id !== pl.old.id))
            return
          }
          const row = toPerson(pl.new)
          if (pending.current[row.id]) return
          setPeople((list) => {
            const i = list.findIndex((p) => p.id === row.id)
            if (i < 0) return [...list, row]
            const next = list.slice()
            next[i] = row
            return next
          })
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'meetings', filter: `id=eq.${mid}` }, (pl) => {
          setCfg(fromRow(pl.new))
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'meetings', filter: `id=eq.${mid}` }, () => {
          setState({ status: 'error', error: 'deleted' })
        })
        .subscribe((st) => {
          if (st === 'SUBSCRIBED') setLive('live')
          else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') setLive('off')
        })
    })()
    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, [mid])

  const updateCfg = useCallback(
    async (patch) => {
      setCfg((c) => ({ ...c, ...patch }))
      const up = {}
      for (const k in patch) if (CFG_COLS[k]) up[CFG_COLS[k]] = patch[k]
      const { error } = await supabase.from('meetings').update(up).eq('id', mid)
      if (error) errRef.current?.(`저장하지 못했어요: ${error.message}`)
    },
    [mid],
  )

  const updatePerson = useCallback(async (pid, fields) => {
    setPeople((list) => list.map((p) => (p.id === pid ? { ...p, ...fields } : p)))
    pending.current[pid] = (pending.current[pid] || 0) + 1
    const { error } = await supabase.from('participants').update(fields).eq('id', pid)
    pending.current[pid] -= 1
    if (error) errRef.current?.(`저장하지 못했어요: ${error.message}`)
  }, [])

  const addGuest = useCallback(async () => {
    const { data, error } = await supabase
      .from('participants')
      .insert({ meeting_id: mid, name: '', user_id: null })
      .select(PERSON_COLS)
      .single()
    if (error) {
      errRef.current?.(`추가하지 못했어요: ${error.message}`)
      return null
    }
    const row = toPerson(data)
    setPeople((list) => (list.some((p) => p.id === row.id) ? list : [...list, row]))
    return row.id
  }, [mid])

  const removePerson = useCallback(async (pid) => {
    const { error } = await supabase.from('participants').delete().eq('id', pid)
    if (error) {
      errRef.current?.(`삭제하지 못했어요: ${error.message}`)
      return false
    }
    setPeople((list) => list.filter((p) => p.id !== pid))
    return true
  }, [])

  return { ...state, cfg, people, myPid, live, updateCfg, updatePerson, addGuest, removePerson }
}
