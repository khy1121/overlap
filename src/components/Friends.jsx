import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { copyText } from '../lib/copy'
import { cancelRequest, myRequests, requestByCode, respondRequest, resultText } from '../lib/friends'
import { KAKAO_BTN, canKakaoShare, shareKakao } from '../lib/kakao'
import { useToast } from '../hooks/useToast'
import Avatar from './Avatar'
import PageHeader from './PageHeader'
import KakaoFriends from './KakaoFriends'

const PAGE = 10
export const formatCode = (c) => (c ? `${c.slice(0, 4)}-${c.slice(4)}` : '')

/** 친구 코드로 신청하는 입력 칸 (약속 초대 창에서도 써요) */
export function AddFriend({ onAdded, autoFocus = false }) {
  const toast = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  async function add(e) {
    e.preventDefault()
    if (!code.trim()) return
    setBusy(true)
    try {
      const res = await requestByCode(code)
      setCode('')
      toast(resultText(res.result, res.name))
      onAdded?.(res)
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form className="flex gap-2" onSubmit={add}>
      <input
        aria-label="친구 초대 코드"
        autoFocus={autoFocus}
        placeholder="친구 코드 (예: K7PQ-3M9X)"
        className="field-input min-w-0 flex-1 font-mono uppercase tracking-wider"
        value={code}
        maxLength={12}
        onChange={(e) => setCode(e.target.value)}
      />
      <button className="btn-primary min-h-[48px]" type="submit" disabled={busy}>신청</button>
    </form>
  )
}

/** 코드로 친구 신청 창: 친구 코드 입력 + 내 코드 공유 */
function AddFriendDialog({ open, onClose, onAdded }) {
  const toast = useToast()
  const ref = useRef(null)
  const [me, setMe] = useState(null)
  const [renewing, setRenewing] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      supabase.rpc('my_profile').then(({ data }) => setMe(data?.[0] || null))
    } else if (!open && d.open) d.close()
  }, [open])

  async function regenerate() {
    setRenewing(false)
    const { data, error } = await supabase.rpc('regenerate_invite_code')
    if (error) return toast('코드를 새로 만들지 못했어요.')
    setMe((m) => ({ ...m, invite_code: data }))
    toast('새 코드를 만들었어요. 이전 코드는 이제 쓸 수 없어요.')
  }

  const code = formatCode(me?.invite_code)
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="add-friend-title"
      className="m-auto w-[calc(100%-32px)] max-w-[420px] rounded-[20px] border-0 bg-sheet p-0 text-ink shadow-float backdrop:bg-black/40"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start justify-between gap-3">
          <h2 id="add-friend-title" className="m-0 text-[20px] font-bold">코드로 친구 신청</h2>
          <button className="btn-ghost btn-sm !px-2" aria-label="닫기" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <section>
          <div className="mb-1.5 text-[13px] font-medium text-ink2">친구 코드 입력</div>
          <AddFriend autoFocus onAdded={(f) => { onAdded?.(f); onClose() }} />
        </section>

        <section className="rounded-[16px] bg-rule2 p-4">
          <div className="text-[13px] font-medium text-ink2">내 초대 코드</div>
          <b className="tabular mt-1 block font-mono text-[24px] tracking-[.14em]">{code || '····-····'}</b>
          <p className="m-0 mt-1 text-[13px] text-ink2">이 코드를 받은 친구가 입력하면 나에게 친구 신청이 와요.</p>
          <div className="mt-3 flex gap-2">
            <button
              className="btn-primary flex-1"
              disabled={!code}
              onClick={async () => toast((await copyText(`Overlap에서 친구 추가해 줘! 내 초대 코드: ${code}\n${window.location.origin}`)) ? '코드를 복사했어요' : '복사하지 못했어요')}
            >
              코드 복사
            </button>
            <button className="btn-ghost" disabled={!code} onClick={() => setRenewing(true)}>새 코드</button>
          </div>
          {canKakaoShare() && code && (
            <button
              className={`btn mt-2 w-full ${KAKAO_BTN}`}
              onClick={() =>
                shareKakao({
                  title: 'Overlap에서 친구 해요!',
                  description: `내 친구 코드: ${code}\n앱에서 코드를 입력하면 친구 신청이 와요.`,
                  url: window.location.origin,
                  button: 'Overlap 열기',
                }).catch((e) => toast(e.message))
              }
            >
              카카오톡으로 내 코드 보내기
            </button>
          )}
          {renewing && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[12px] bg-maybe-soft px-3 py-2 text-[13px] text-ink" role="alert">
              <span className="min-w-0 flex-1">새 코드를 만들면 지금 코드로는 친구를 맺을 수 없어요.</span>
              <button className="btn btn-sm bg-sheet" onClick={regenerate}>새로 만들기</button>
              <button className="btn-ghost btn-sm" onClick={() => setRenewing(false)}>취소</button>
            </div>
          )}
        </section>
      </div>
    </dialog>
  )
}

/** 친구 목록 읽기: 최근에 같은 회의가 잡힌 순서로 10명씩. 서버 함수가 없으면 이름순으로 대신 보여 줘요. */
async function fetchFriends(offset) {
  const r = await supabase.rpc('my_friends_recent', { lim: PAGE, off: offset })
  if (!r.error) return { rows: r.data, total: Number(r.data[0]?.total ?? offset), recent: true }
  const all = await supabase.rpc('my_friends')
  const list = all.error ? [] : all.data
  return { rows: list.slice(offset, offset + PAGE), total: list.length, recent: false }
}

/** 친구 페이지 (/?page=friends) */
export default function Friends({ session }) {
  const toast = useToast()
  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [recent, setRecent] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dialog, setDialog] = useState(false)
  const [confirming, setConfirming] = useState(null)
  const [requests, setRequests] = useState([])

  const reload = useCallback(async () => {
    const [r, reqs] = await Promise.all([fetchFriends(0), myRequests()])
    setRows(r.rows)
    setTotal(r.total)
    setRecent(r.recent)
    setRequests(reqs)
  }, [])

  async function respond(req, accept) {
    try {
      await respondRequest(req.id, accept)
      toast(accept ? `${req.name || '친구'}님과 친구가 됐어요` : '신청을 거절했어요')
      reload()
    } catch (e) {
      toast(e.message)
    }
  }
  async function cancel(req) {
    try {
      await cancelRequest(req.id)
      setRequests((list) => list.filter((x) => x.id !== req.id))
      toast('신청을 취소했어요')
    } catch (e) {
      toast(e.message)
    }
  }
  const incoming = requests.filter((x) => x.direction === 'in')
  const outgoing = requests.filter((x) => x.direction === 'out')
  useEffect(() => { reload() }, [reload])

  async function more() {
    setBusy(true)
    const r = await fetchFriends(rows.length)
    setBusy(false)
    setRows((list) => [...list, ...r.rows.filter((x) => !list.some((y) => y.user_id === x.user_id))])
    setTotal(r.total)
  }
  async function remove(f) {
    const { error } = await supabase.rpc('remove_friend', { target: f.user_id })
    setConfirming(null)
    if (error) return toast('친구를 끊지 못했어요.')
    setRows((list) => list.filter((x) => x.user_id !== f.user_id))
    setTotal((t) => Math.max(0, t - 1))
  }

  const fmt = (d) => { const [, m, day] = d.split('-').map(Number); return `${m}/${day}` }
  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-4">
      <PageHeader title="친구" sub={recent ? '최근에 함께 약속을 잡은 친구부터 보여요.' : '친구 목록이에요.'}>
        <button className="btn-primary" onClick={() => setDialog(true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          코드로 친구 신청
        </button>
      </PageHeader>

      <KakaoFriends user={session?.user} onChanged={reload} />

      {incoming.length > 0 && (
        <section className="sheet !py-2" aria-label="받은 친구 신청">
          <div className="flex items-center gap-2 px-1 pb-1 pt-2">
            <b className="text-[15px]">받은 신청</b>
            <span className="rounded-full bg-no px-2 text-[12px] font-bold text-white">{incoming.length}</span>
          </div>
          <ul className="m-0 list-none p-0">
            {incoming.map((req) => (
              <li key={req.id} className="flex items-center gap-3 border-b border-rule2 px-1 py-3 last:border-0">
                <Avatar name={req.name} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{req.name || '이름 없음'}</div>
                  <div className="text-[13px] text-ink2">친구 신청을 보냈어요</div>
                </div>
                <button className="btn-primary btn-sm" onClick={() => respond(req, true)}>수락</button>
                <button className="btn-ghost btn-sm" onClick={() => respond(req, false)}>거절</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="sheet !py-2">
        <div className="px-1 pb-1 pt-2">
          <b className="text-[15px]">친구 {total}명</b>
        </div>
        <ul className="m-0 list-none p-0">
          {rows === null && <li className="px-1 py-4 text-[13px] text-ink2">불러오는 중…</li>}
          {rows?.length === 0 && (
            <li className="flex flex-col items-start gap-3 px-1 py-6 text-[15px] text-ink2">
              아직 친구가 없어요. 초대 코드를 주고받으면 친구가 돼요.
              <button className="btn-soft" onClick={() => setDialog(true)}>코드로 친구 신청</button>
            </li>
          )}
          {rows?.map((f) => (
            <li key={f.user_id} className="flex items-center gap-3 border-b border-rule2 px-1 py-3 last:border-0">
              <Avatar name={f.name} size={40} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{f.name || '이름 없음'}</div>
                <div className="truncate text-[13px] text-ink2">
                  {f.last_date ? `최근 함께: ${fmt(f.last_date)} · ${f.last_title}` : recent ? '아직 함께한 약속이 없어요' : ''}
                </div>
              </div>
              {confirming === f.user_id ? (
                <span className="flex shrink-0 items-center gap-1">
                  <button className="btn btn-sm text-no" onClick={() => remove(f)}>끊기</button>
                  <button className="btn-ghost btn-sm" onClick={() => setConfirming(null)}>취소</button>
                </span>
              ) : (
                <button className="btn-ghost btn-sm" onClick={() => setConfirming(f.user_id)}>친구 끊기</button>
              )}
            </li>
          ))}
        </ul>
        {outgoing.length > 0 && (
          <div className="border-t border-rule2 px-1 pb-1 pt-3">
            <div className="mb-1 text-[13px] font-semibold text-ink2">수락 기다리는 중</div>
            <ul className="m-0 list-none p-0">
              {outgoing.map((req) => (
                <li key={req.id} className="flex items-center gap-3 py-2">
                  <Avatar name={req.name} size={32} />
                  <span className="min-w-0 flex-1 truncate text-[15px]">{req.name || '이름 없음'}</span>
                  <button className="btn-ghost btn-sm" onClick={() => cancel(req)}>신청 취소</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {rows && rows.length < total && (
          <button className="btn-ghost mb-2 mt-1 w-full" onClick={more} disabled={busy}>
            {busy ? '불러오는 중…' : `더 보기 (${Math.min(PAGE, total - rows.length)}명)`}
          </button>
        )}
      </section>

      <AddFriendDialog open={dialog} onClose={() => setDialog(false)} onAdded={reload} />
    </div>
  )
}
