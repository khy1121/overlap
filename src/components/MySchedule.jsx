import { useEffect, useMemo, useState } from 'react'
import { DAYS, iso } from '../lib/schedule'
import { confirmedTime, fetchMyMeetings, googleAddLink, hm, meetingSpan } from '../lib/meetings'
import { requestCalendarToken } from '../lib/googleCalendar'
import { useToast } from '../hooks/useToast'
import PageHeader from './PageHeader'

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)

/** 내 일정 (/?page=schedule): 확정된 회의를 달력으로, Google 캘린더 바쁜 시간도 함께 */
export default function MySchedule() {
  const toast = useToast()
  const today = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1))
  const [picked, setPicked] = useState(today)
  const [meetings, setMeetings] = useState(null)
  const [gToken, setGToken] = useState(null)
  const [gBusy, setGBusy] = useState([])
  const [gLoading, setGLoading] = useState(false)

  useEffect(() => { fetchMyMeetings().then(setMeetings) }, [])

  // 달력에 보이는 칸(일요일 시작, 6주)
  const first = addDays(month, -month.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i))
  const last = cells[41]

  // Google 캘린더: 보이는 기간의 바쁜 시간만(free/busy) 읽어요. 제목·내용은 받지 않아요.
  useEffect(() => {
    if (!gToken) return
    let cancelled = false
    setGLoading(true)
    fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${gToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeMin: first.toISOString(), timeMax: addDays(last, 1).toISOString(), items: [{ id: 'primary' }] }),
    })
      .then(async (r) => {
        if (r.status === 401 || r.status === 403) {
          setGToken(null)
          throw new Error('Google 캘린더 권한이 만료됐어요. 다시 연결해 주세요.')
        }
        const j = await r.json()
        if (!cancelled) setGBusy((j.calendars?.primary?.busy || []).map((b) => ({ start: new Date(b.start), end: new Date(b.end) })))
      })
      .catch((e) => toast(e.message || 'Google 캘린더를 불러오지 못했어요'))
      .finally(() => !cancelled && setGLoading(false))
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gToken, month])

  async function connectGoogle() {
    try {
      setGToken(await requestCalendarToken())
    } catch (e) {
      toast(e.message)
    }
  }

  const confirmed = useMemo(
    () => (meetings || []).map((m) => ({ m, t: confirmedTime(m) })).filter((x) => x.t).sort((a, b) => a.t.start - b.t.start),
    [meetings],
  )
  // 아직 확정 안 된 회의 (지난 것도 다시 열 수 있게 모두, 최근 기간 순)
  const pending = useMemo(
    () => (meetings || []).filter((m) => !confirmedTime(m)).sort((a, b) => b.start_date.localeCompare(a.start_date)),
    [meetings],
  )

  const eventsOn = (day) => {
    const next = addDays(day, 1)
    return [
      ...confirmed.filter((x) => sameDay(x.t.start, day)).map((x) => ({ kind: 'meet', start: x.t.start, end: x.t.end, m: x.m })),
      ...gBusy.filter((b) => b.start < next && b.end > day).map((b) => ({ kind: 'google', start: b.start < day ? day : b.start, end: b.end > next ? next : b.end })),
    ].sort((a, b) => a.start - b.start)
  }
  const dayEvents = eventsOn(picked)
  const pendingOn = (day) => pending.filter((m) => { const s = meetingSpan(m); return day >= s.start && day <= s.end })

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="내 일정" sub="확정된 약속을 달력으로 보고, Google 캘린더의 바쁜 시간도 함께 확인해요.">
        {gToken ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] text-ink2">
            <i className="h-2 w-2 rounded-full bg-yes" /> {gLoading ? 'Google 캘린더 불러오는 중…' : 'Google 캘린더 연결됨'}
          </span>
        ) : (
          <button className="btn" onClick={connectGoogle}>
            <GoogleIcon /> Google 캘린더 연결
          </button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1fr)_320px]">
        <section className="sheet !p-3 sm:!p-5" aria-label="달력">
          <div className="mb-3 flex items-center justify-between">
            <button className="btn-ghost btn-sm !px-2" aria-label="이전 달" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <div className="flex items-center gap-2">
              <b className="text-[17px] font-bold">{month.getFullYear()}년 {month.getMonth() + 1}월</b>
              {!(month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()) && (
                <button className="btn-soft btn-sm" onClick={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setPicked(today) }}>오늘</button>
              )}
            </div>
            <button className="btn-ghost btn-sm !px-2" aria-label="다음 달" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-medium text-ink2">
            {DAYS.map((d, i) => <div key={d} className={`pb-2 ${i === 0 ? 'text-no' : ''}`}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-[12px] bg-rule">
            {cells.map((day) => {
              const ev = eventsOn(day)
              const pend = pendingOn(day).length
              const inMonth = day.getMonth() === month.getMonth()
              const isToday = sameDay(day, today)
              const isPicked = sameDay(day, picked)
              return (
                <button
                  key={iso(day)}
                  type="button"
                  aria-pressed={isPicked}
                  aria-label={`${day.getMonth() + 1}월 ${day.getDate()}일, 일정 ${ev.filter((e) => e.kind === 'meet').length}개`}
                  onClick={() => setPicked(day)}
                  className={`flex min-h-[64px] flex-col items-stretch gap-0.5 rounded-none border-0 p-1 text-left active:!transform-none md:min-h-[96px] md:p-1.5 ${
                    isPicked ? 'bg-pen-soft' : 'bg-sheet hover:bg-rule2'
                  } ${inMonth ? '' : '[&>*]:opacity-40'}`}
                >
                  <span
                    className={`grid h-6 w-6 place-items-center self-center rounded-full text-[13px] font-semibold md:self-start ${
                      isToday ? 'bg-pen-strong text-pen-ink' : day.getDay() === 0 ? 'text-no' : 'text-ink'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                  {/* 데스크톱: 일정 제목 칩, 모바일: 점 */}
                  <span className="hidden flex-col gap-0.5 md:flex">
                    {ev.slice(0, 3).map((e, i) => (
                      <span
                        key={i}
                        className={`truncate rounded-[6px] px-1.5 py-px text-[11px] font-medium ${e.kind === 'meet' ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink2'}`}
                      >
                        {hm(e.start)} {e.kind === 'meet' ? e.m.title : 'Google 일정'}
                      </span>
                    ))}
                    {ev.length > 3 && <span className="px-1 text-[11px] text-ink2">+{ev.length - 3}</span>}
                    {pend > 0 && <span className="mt-0.5 h-1 rounded-full bg-maybe" title="시간 조율 중인 약속 기간" />}
                  </span>
                  <span className="flex justify-center gap-0.5 md:hidden" aria-hidden="true">
                    {ev.slice(0, 3).map((e, i) => <i key={i} className={`h-1.5 w-1.5 rounded-full ${e.kind === 'meet' ? 'bg-pen-strong' : 'bg-ink2'}`} />)}
                    {pend > 0 && <i className="h-1.5 w-1.5 rounded-full bg-maybe" />}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink2">
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-pen-strong" />확정된 약속</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-maybe" />시간 조율 중</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-[3px] bg-ink2" />Google 캘린더(바쁨)</span>
          </div>
        </section>

        <aside className="flex flex-col gap-4">
          <section className="sheet">
            <h2 className="m-0 text-[17px] font-bold">
              {picked.getMonth() + 1}월 {picked.getDate()}일 ({DAYS[picked.getDay()]})
            </h2>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {meetings === null && <li className="text-[13px] text-ink2">불러오는 중…</li>}
              {meetings !== null && !dayEvents.length && !pendingOn(picked).length && <li className="text-[13px] text-ink2">잡힌 일정이 없어요.</li>}
              {dayEvents.map((e, i) => (
                <li key={i} className={`rounded-[14px] px-3.5 py-3 ${e.kind === 'meet' ? 'bg-pen-soft' : 'bg-rule2'}`}>
                  <div className="text-[13px] font-semibold text-ink2 tabular">{hm(e.start)}–{hm(e.end)}</div>
                  {e.kind === 'meet' ? (
                    <>
                      <a href={`/?m=${e.m.id}`} className="block truncate text-[15px] font-bold text-ink no-underline hover:underline">{e.m.title}</a>
                      <a href={googleAddLink(e.m, { start: e.start, end: e.end })} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-accent no-underline hover:underline">
                        <GoogleIcon /> Google 캘린더에 추가
                      </a>
                    </>
                  ) : (
                    <div className="text-[15px] font-semibold text-ink2">Google 캘린더 일정 (바쁨)</div>
                  )}
                </li>
              ))}
              {pendingOn(picked).map((m) => (
                <li key={m.id} className="rounded-[14px] bg-maybe-soft px-3.5 py-3">
                  <div className="text-[13px] font-semibold text-ink2">시간 조율 중</div>
                  <a href={`/?m=${m.id}`} className="block truncate text-[15px] font-bold text-ink no-underline hover:underline">{m.title}</a>
                </li>
              ))}
            </ul>
          </section>

          <section className="sheet">
            <h2 className="m-0 text-[17px] font-bold">시간 조율 중인 약속</h2>
            <ul className="m-0 mt-2 list-none p-0">
              {meetings !== null && !pending.length && <li className="py-2 text-[13px] text-ink2">조율 중인 약속이 없어요.</li>}
              {pending.slice(0, 20).map((m) => {
                const s = meetingSpan(m)
                return (
                  <li key={m.id} className="border-b border-rule2 last:border-0">
                    <a href={`/?m=${m.id}`} className="flex items-center justify-between gap-2 py-2.5 text-ink no-underline hover:text-accent">
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold">{m.title}</span>
                        <span className="text-[13px] text-ink2">{s.start.getMonth() + 1}/{s.start.getDate()} – {s.end.getMonth() + 1}/{s.end.getDate()} · {m.participants?.[0]?.count ?? 0}명 참여</span>
                      </span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-ink2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
                    </a>
                  </li>
                )
              })}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
