import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { copyText } from '../lib/copy'
import { useToast } from '../hooks/useToast'
import Avatar from './Avatar'

const ERRORS = {
  'code not found': '그런 초대 코드가 없어요. 다시 확인해 주세요.',
  'own code': '내 초대 코드예요. 친구의 코드를 입력해 주세요.',
}
export const friendError = (e) => ERRORS[Object.keys(ERRORS).find((k) => e.message.includes(k))] || `친구를 추가하지 못했어요: ${e.message}`
export const formatCode = (c) => (c ? `${c.slice(0, 4)}-${c.slice(4)}` : '')

/** 친구 코드 입력 칸 */
export function AddFriend({ onAdded }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  async function add(e) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    const { data, error } = await supabase.rpc('add_friend_by_code', { code })
    setBusy(false)
    if (error) return toast(friendError(error))
    setCode('')
    toast(`${data?.[0]?.name || '친구'}님과 친구가 됐어요`)
    onAdded?.(data?.[0])
  }
  return (
    <form className="flex gap-1.5" onSubmit={add}>
      <input
        aria-label="친구 초대 코드"
        placeholder="친구 코드 (예: K7PQ-3M9X)"
        className="min-w-0 flex-1 rounded border border-rule bg-paper px-2.5 py-1.5 font-mono text-sm uppercase tracking-wider"
        value={code}
        maxLength={12}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="btn" type="submit" disabled={busy}>친구 추가</button>
    </form>
  )
}

/** 홈 화면의 친구 카드: 내 코드, 코드로 추가, 친구 목록 */
export default function Friends() {
  const toast = useToast()
  const [me, setMe] = useState(null)
  const [friends, setFriends] = useState(null)
  const [confirming, setConfirming] = useState(null)

  const load = useCallback(async () => {
    const [p, f] = await Promise.all([supabase.rpc('my_profile'), supabase.rpc('my_friends')])
    setMe(p.data?.[0] || null)
    setFriends(f.error ? [] : f.data)
  }, [])
  useEffect(() => { load() }, [load])

  async function regenerate() {
    const { data, error } = await supabase.rpc('regenerate_invite_code')
    if (error) return toast('코드를 새로 만들지 못했어요.')
    setMe((m) => ({ ...m, invite_code: data }))
    toast('새 코드를 만들었어요. 이전 코드는 이제 쓸 수 없어요.')
  }
  async function remove(f) {
    const { error } = await supabase.rpc('remove_friend', { target: f.user_id })
    setConfirming(null)
    if (error) return toast('친구를 끊지 못했어요.')
    setFriends((list) => list.filter((x) => x.user_id !== f.user_id))
  }

  const code = formatCode(me?.invite_code)
  return (
    <section className="sheet">
      <h2 className="mb-1 mt-0 font-display text-lg font-extrabold">친구</h2>
      <p className="small mb-3 mt-0">초대 코드를 주고받으면 친구가 돼요. 친구는 회의에 바로 초대할 수 있어요.</p>

      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-rule px-3 py-2.5">
        <span className="text-[13px] text-ink2">내 초대 코드</span>
        <b className="tabular font-mono text-lg tracking-[.12em]">{code || '····-····'}</b>
        <span className="flex-1" />
        <button
          className="btn"
          disabled={!code}
          onClick={async () =>
            toast((await copyText(`Overlap에서 친구 추가해 줘! 내 초대 코드: ${code}\n${window.location.origin}`)) ? '코드를 복사했어요' : '복사하지 못했어요')
          }
        >
          복사
        </button>
        <button className="link-btn" disabled={!code} onClick={regenerate}>새 코드 받기</button>
      </div>

      <AddFriend onAdded={load} />

      <ul className="m-0 mt-3 list-none border-t border-rule p-0">
        {friends === null && <li className="px-1 py-2.5 text-[13px] text-ink2">불러오는 중…</li>}
        {friends?.length === 0 && <li className="px-1 py-2.5 text-[13px] text-ink2">아직 친구가 없어요. 내 코드를 보내거나 친구 코드를 입력해 보세요.</li>}
        {friends?.map((f) => (
          <li key={f.user_id} className="flex items-center gap-2 border-b border-rule2 px-1 py-2 text-[13px]">
            <Avatar name={f.name} />
            <span className="min-w-0 flex-1 truncate">{f.name || '이름 없음'}</span>
            {confirming === f.user_id ? (
              <>
                <span className="small">친구를 끊을까요?</span>
                <button className="btn btn-sm text-no" onClick={() => remove(f)}>끊기</button>
                <button className="btn-ghost btn-sm" onClick={() => setConfirming(null)}>취소</button>
              </>
            ) : (
              <button className="btn-ghost btn-sm" onClick={() => setConfirming(f.user_id)}>친구 끊기</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
