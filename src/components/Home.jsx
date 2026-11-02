import { useEffect, useMemo, useState } from 'react'
import { displayName } from '../lib/auth'
import { DAYS } from '../lib/schedule'
import { confirmedTime, fetchMyMeetings, hm, meetingSpan } from '../lib/meetings'
import { myRequests } from '../lib/friends'
import InstallApp from './InstallApp'
import KakaoLink from './KakaoLink'

const ACTIONS = [
  {
    href: '/?page=new',
    title: '새 약속 만들기',
    desc: '회의도, 친구 모임도 시간 맞추기부터',
    tone: 'bg-pen-strong text-pen-ink',
    icon: <path d="M12 5v14M5 12h14" />,
  },
  {
    href: '/?page=schedule',
    title: '내 일정 보기',
    desc: '확정된 약속을 달력으로 확인해요',
    tone: 'bg-yes-soft text-ink',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="3" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </>
    ),
  },
  {
    href: '/?page=friends',
    title: '친구',
    desc: '친구 신청을 주고받고 목록을 봐요',
    tone: 'bg-maybe-soft text-ink',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
      </>
    ),
  },
]

/** 홈: 큰 동작 버튼 3개 + 다가오는 회의 + 조율 중인 회의 */
export default function Home({ session }) {
  const [list, setList] = useState(null)
  const [incoming, setIncoming] = useState(0)
  useEffect(() => {
    fetchMyMeetings().then(setList)
    myRequests().then((reqs) => setIncoming(reqs.filter((r) => r.direction === 'in').length))
  }, [])

  const now = useMemo(() => new Date(), [])
  const upcoming = useMemo(
    () => (list || []).map((m) => ({ m, t: confirmedTime(m) })).filter((x) => x.t && x.t.end > now).sort((a, b) => a.t.start - b.t.start).slice(0, 3),
    [list, now],
  )
  const ongoing = useMemo(
    () => (list || []).filter((m) => !confirmedTime(m) && meetingSpan(m).end >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)),
    [list, now],
  )

  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 mt-2 text-[26px] font-extrabold leading-snug tracking-[-.02em]">
        {displayName(session.user)}님,
        <br />
        어떤 걸 해 볼까요?
      </h1>

      <nav className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="바로가기">
        {ACTIONS.map((a) => (
          <a key={a.href} href={a.href} className="sheet flex items-center gap-4 text-ink no-underline transition-transform active:scale-[.98] sm:flex-col sm:items-start">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[14px] ${a.tone}`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{a.icon}</svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-[17px] font-bold">
                {a.title}
                {a.href === '/?page=friends' && incoming > 0 && (
                  <span className="rounded-full bg-no px-2 text-[12px] font-bold leading-5 text-white" aria-label={`받은 친구 신청 ${incoming}개`}>{incoming}</span>
                )}
              </span>
              <span className="block text-[13px] text-ink2">{a.desc}</span>
            </span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink2 sm:hidden" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </a>
        ))}
      </nav>

      <InstallApp />
      <KakaoLink user={session.user} />

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
        <section className="sheet">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-[17px] font-bold">다가오는 약속</h2>
            <a href="/?page=schedule" className="text-[13px] font-semibold text-ink2 no-underline hover:text-ink">달력 보기</a>
          </div>
          <ul className="m-0 mt-2 list-none p-0">
            {list === null && <li className="py-2 text-[13px] text-ink2">불러오는 중…</li>}
            {list !== null && !upcoming.length && <li className="py-2 text-[13px] text-ink2">확정된 약속이 아직 없어요.</li>}
            {upcoming.map(({ m, t }) => (
              <li key={m.id} className="border-b border-rule2 last:border-0">
                <a href={`/?m=${m.id}`} className="flex items-center gap-3 py-2.5 text-ink no-underline">
                  <span className="grid w-12 shrink-0 place-items-center rounded-[12px] bg-pen-soft py-1 leading-tight text-accent">
                    <span className="text-[11px] font-semibold">{t.start.getMonth() + 1}월</span>
                    <span className="text-[18px] font-extrabold">{t.start.getDate()}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold">{m.title}</span>
                    <span className="text-[13px] text-ink2">({DAYS[t.start.getDay()]}) {hm(t.start)}–{hm(t.end)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="sheet">
          <h2 className="m-0 text-[17px] font-bold">시간 조율 중</h2>
          <ul className="m-0 mt-2 list-none p-0">
            {list === null && <li className="py-2 text-[13px] text-ink2">불러오는 중…</li>}
            {list !== null && !ongoing.length && (
              <li className="py-2 text-[13px] text-ink2">
                조율 중인 약속이 없어요. <a href="/?page=new" className="font-semibold text-accent">새 약속 만들기</a>
              </li>
            )}
            {ongoing.slice(0, 6).map((m) => {
              const s = meetingSpan(m)
              return (
                <li key={m.id} className="border-b border-rule2 last:border-0">
                  <a href={`/?m=${m.id}`} className="flex items-center justify-between gap-2 py-2.5 text-ink no-underline">
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-semibold">{m.title}</span>
                      <span className="text-[13px] text-ink2">
                        {s.start.getMonth() + 1}/{s.start.getDate()}–{s.end.getMonth() + 1}/{s.end.getDate()} · {m.participants?.[0]?.count ?? 0}명 참여{m.owner === session.user.id ? ' · 내가 만듦' : ''}
                      </span>
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                  </a>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}
