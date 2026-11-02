import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { md, nDays } from '../lib/schedule'
import { copyText } from '../lib/copy'
import { KAKAO_BTN, canKakaoShare, shareKakao } from '../lib/kakao'
import { useToast } from '../hooks/useToast'
import Avatar from './Avatar'
import { AddFriend } from './Friends'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** 초대 창: 저장된 친구 목록 → 링크 한 줄 → 이메일 한 줄 */
export default function InvitePanel({ mid, cfg, link, onClose }) {
  const toast = useToast()
  const [friends, setFriends] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [emails, setEmails] = useState('')
  const inviteText = `${cfg.title} 시간 맞추기\n되는 시간을 칠해 주세요!\n${link}`

  const load = useCallback(() => {
    supabase.rpc('my_friends', { mid }).then(({ data, error }) => setFriends(error ? [] : data))
  }, [mid])
  useEffect(load, [load])

  async function invite(list) {
    const results = await Promise.all(list.map((f) => supabase.rpc('invite_friend', { mid, target: f.user_id })))
    const ok = list.filter((_, i) => !results[i].error)
    setFriends((all) => all.map((x) => (ok.some((f) => f.user_id === x.user_id) ? { ...x, in_meeting: true } : x)))
    if (ok.length < list.length) toast('일부 친구를 초대하지 못했어요. 다시 시도해 주세요.')
    else toast(ok.length === 1 ? `${ok[0].name || '친구'}님을 초대했어요` : `친구 ${ok.length}명을 초대했어요`)
  }

  function sendEmails(e) {
    e.preventDefault()
    const list = emails.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)
    const bad = list.filter((x) => !EMAIL_RE.test(x))
    if (!list.length) return toast('이메일 주소를 입력해 주세요')
    if (bad.length) return toast(`주소를 확인해 주세요: ${bad.join(', ')}`)
    const subject = `[Overlap] ${cfg.title} 시간 맞추기`
    const body = `"${cfg.title}" 시간을 정하려고 해요.\n${md(cfg, 0)}–${md(cfg, nDays(cfg) - 1)} 중 되는 시간을 칠해 주세요.\n\n${link}`
    window.location.href = `mailto:?bcc=${encodeURIComponent(list.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const waiting = friends?.filter((f) => !f.in_meeting) || []
  const canShare = typeof navigator !== 'undefined' && navigator.share
  return (
    <section className="flex flex-col gap-5 rounded-[20px] bg-sheet p-5 shadow-soft" aria-label="초대하기">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[18px] font-bold">초대하기</h2>
        <button className="btn-ghost btn-sm !px-2" aria-label="초대 창 닫기" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* 저장된 친구 */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold">친구</span>
          {waiting.length > 1 && <button className="btn-soft btn-sm" onClick={() => invite(waiting)}>모두 초대 ({waiting.length})</button>}
        </div>
        {friends === null && <p className="m-0 text-[13px] text-ink2">불러오는 중…</p>}
        {friends?.length === 0 && <p className="m-0 text-[13px] text-ink2">저장된 친구가 없어요. 아래에서 코드로 추가하거나 링크를 보내 주세요.</p>}
        {friends?.length > 0 && (
          <ul className="m-0 grid max-h-[232px] list-none grid-cols-1 gap-0.5 overflow-auto p-0 sm:grid-cols-2 sm:gap-x-3">
            {friends.map((f) => (
              <li key={f.user_id} className="flex items-center gap-2.5 py-1.5">
                <Avatar name={f.name} size={32} />
                <span className="min-w-0 flex-1 truncate text-[15px]">{f.name || '이름 없음'}</span>
                {f.in_meeting ? (
                  <span className="text-[13px] text-ink2">참여 중</span>
                ) : (
                  <button className="btn-soft btn-sm" onClick={() => invite([f])}>초대</button>
                )}
              </li>
            ))}
          </ul>
        )}
        {addOpen ? (
          <AddFriend autoFocus onAdded={() => { setAddOpen(false); load() }} />
        ) : (
          <button className="btn-ghost btn-sm self-start" onClick={() => setAddOpen(true)}>+ 코드로 친구 신청</button>
        )}
      </div>

      {/* 링크 */}
      <div className="flex flex-col gap-2 border-t border-rule2 pt-4">
        <span className="text-[15px] font-semibold">카카오톡·링크로 초대</span>
        {canKakaoShare() && (
          <button
            className={`btn btn-lg w-full ${KAKAO_BTN}`}
            onClick={() =>
              shareKakao({
                title: `${cfg.title} 언제 만날까요?`,
                description: `${md(cfg, 0)}–${md(cfg, nDays(cfg) - 1)} 중 되는 시간을 칠해 주세요`,
                url: link,
                button: '시간 칠하러 가기',
              }).catch((e) => toast(e.message))
            }
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#000" d="M12 3C6.48 3 2 6.48 2 10.78c0 2.78 1.86 5.22 4.66 6.6l-.95 3.48c-.08.3.26.54.52.37l4.15-2.74c.53.07 1.07.11 1.62.11 5.52 0 10-3.48 10-7.82S17.52 3 12 3Z" />
            </svg>
            카카오톡으로 초대 보내기
          </button>
        )}
        <div className="flex items-center gap-2 rounded-[14px] bg-rule2 p-1.5 pl-3.5">
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink2">{link.replace(/^https?:\/\//, '')}</span>
          <button className="btn-primary btn-sm" onClick={async () => toast((await copyText(inviteText)) ? '초대 문구를 복사했어요' : '복사하지 못했어요')}>복사</button>
          {canShare && (
            <button className="btn btn-sm bg-sheet" aria-label="다른 앱으로 공유" onClick={() => navigator.share({ title: cfg.title, text: inviteText }).catch(() => {})}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
              공유
            </button>
          )}
        </div>
      </div>

      {/* 이메일 */}
      <form className="flex flex-col gap-2 border-t border-rule2 pt-4" onSubmit={sendEmails}>
        <label htmlFor="invite-emails" className="text-[15px] font-semibold">이메일로 초대</label>
        <div className="flex gap-2">
          <input
            id="invite-emails"
            type="text"
            inputMode="email"
            autoComplete="off"
            placeholder="여러 명은 쉼표로 (a@ex.com, b@ex.com)"
            className="field-input min-w-0 flex-1"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
          />
          <button className="btn min-h-[48px]" type="submit">보내기</button>
        </div>
      </form>
    </section>
  )
}
