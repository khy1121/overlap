import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { md } from '../lib/schedule'
import { copyText } from '../lib/copy'
import { useToast } from '../hooks/useToast'
import Avatar from './Avatar'
import { AddFriend } from './Friends'

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export default function InvitePanel({ mid, cfg, link, onClose }) {
  const toast = useToast()
  const [emails, setEmails] = useState('')
  const [emailNote, setEmailNote] = useState('')
  const [friends, setFriends] = useState(null)
  const inviteText = `${cfg.title} 시간 맞추기\n되는 시간을 칠해 주세요!\n${link}`

  const load = useCallback(() => {
    supabase.rpc('my_friends', { mid }).then(({ data, error }) => setFriends(error ? [] : data))
  }, [mid])
  useEffect(load, [load])

  function sendEmails() {
    const list = emails.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)
    const bad = list.filter((x) => !EMAIL_RE.test(x))
    if (!list.length) return setEmailNote('이메일 주소를 입력해 주세요.')
    if (bad.length) return setEmailNote(`주소를 확인해 주세요: ${bad.join(', ')}`)
    const subject = `[Overlap] ${cfg.title} 시간 맞추기`
    const body = `안녕하세요!\n\n"${cfg.title}" 회의 시간을 정하려고 해요.\n${md(cfg, 0)}부터 일주일 중 되는 시간을 칠해 주세요.\n\n${link}\n\n이름·생년월일·비밀번호로 간단히 가입하면 바로 참여할 수 있어요.`
    window.location.href = `mailto:?bcc=${encodeURIComponent(list.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setEmailNote('메일 앱이 열리지 않으면 링크를 복사해서 직접 보내 주세요.')
  }

  async function add(f) {
    const { error } = await supabase.rpc('invite_friend', { mid, target: f.user_id })
    if (error) return toast(`추가하지 못했어요: ${error.message}`)
    setFriends((list) => list.map((x) => (x.user_id === f.user_id ? { ...x, in_meeting: true } : x)))
    toast(`${f.name || '친구'}님을 회의에 추가했어요`)
  }

  const h3 = 'm-0 mb-1 font-display text-[15px] font-extrabold'
  return (
    <section className="relative grid grid-cols-1 gap-[18px] rounded-md border border-rule bg-sheet px-[18px] py-4 lg:grid-cols-3" aria-label="초대하기">
      <button className="absolute right-2 top-2 h-8 w-8 rounded text-lg text-ink2 hover:bg-cell" aria-label="초대 창 닫기" onClick={onClose}>×</button>

      <div className="flex min-w-0 flex-col gap-2">
        <h3 className={h3}>친구 초대</h3>
        <p className="small m-0">친구는 누르면 바로 이 회의에 들어와요. 친구 코드를 입력해서 새 친구를 맺을 수도 있어요.</p>
        <ul className="m-0 flex max-h-[220px] list-none flex-col gap-1 overflow-auto p-0">
          {friends === null && <li className="small">불러오는 중…</li>}
          {friends?.length === 0 && <li className="small">아직 친구가 없어요. 아래에 친구 코드를 입력해 보세요.</li>}
          {friends?.map((f) => (
            <li key={f.user_id} className="flex items-center gap-2 px-0.5 py-1 text-[13px]">
              <Avatar name={f.name} />
              <span className="min-w-0 flex-1 truncate">{f.name || '이름 없음'}</span>
              {f.in_meeting ? <span className="small">참여 중</span> : <button className="btn-soft btn-sm" onClick={() => add(f)}>초대</button>}
            </li>
          ))}
        </ul>
        <AddFriend onAdded={load} />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <h3 className={h3}>링크로 초대</h3>
        <p className="small m-0">단톡방이나 메신저에 붙여 넣으세요. 받은 사람은 가입하거나 로그인하면 바로 참여해요.</p>
        <div className="flex gap-1.5">
          <input readOnly aria-label="초대 링크" value={link} className="min-w-0 flex-1 rounded border border-rule bg-paper px-2.5 py-1.5 text-sm" onFocus={(e) => e.target.select()} />
          <button className="btn" onClick={async () => toast((await copyText(inviteText)) ? '복사했어요' : '복사하지 못했어요')}>복사</button>
        </div>
        {typeof navigator !== 'undefined' && navigator.share && (
          <button className="btn" onClick={() => navigator.share({ title: cfg.title, text: inviteText }).catch(() => {})}>다른 앱으로 공유</button>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <h3 className={h3}>이메일로 초대</h3>
        <p className="small m-0">여러 명은 쉼표로 구분해요. 내 메일 앱이 초대 문구가 채워진 채로 열려요.</p>
        <textarea
          aria-label="초대할 이메일"
          placeholder="minsu@example.com, jiyun@example.com"
          className="min-h-[62px] resize-y rounded border border-rule bg-paper px-2.5 py-1.5 text-sm"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
        />
        <button className="btn" onClick={sendEmails}>메일 앱으로 초대 보내기</button>
        {emailNote && <p className="small m-0">{emailNote}</p>}
      </div>
    </section>
  )
}
