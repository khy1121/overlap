import { useEffect, useMemo, useState } from 'react'
import { displayName } from '../lib/auth'
import { DAYS } from '@overlap/core/schedule'
import { confirmedTime, deleteMeeting, fetchMyMeetings, fetchMyEntries, hm, meetingSpan } from '../lib/meetings'
import { useToast } from '../hooks/useToast'
import InstallApp from './InstallApp'
import KakaoLink from './KakaoLink'

/** 목록 줄 오른쪽 끝 휴지통. 한 번 누르면 '삭제 / 취소'로 바뀌고, 삭제를 누르면 실행돼요 */
function RowDelete({ onConfirm }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  if (open) {
    return (
      <span className="flex shrink-0 items-center gap-1">
        <button
          className="btn btn-sm !bg-no !text-white hover:opacity-90 disabled:opacity-50"
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onConfirm() } finally { setBusy(false); setOpen(false) } }}
        >
          {busy ? '…' : '삭제'}
        </button>
        <button className="btn btn-sm" disabled={busy} onClick={() => setOpen(false)}>취소</button>
      </span>
    )
  }
  return (
    <button className="btn-ghost btn-sm shrink-0 !px-2 text-ink2 hover:text-no" aria-label="약속 삭제" title="약속 삭제" onClick={() => setOpen(true)}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" /></svg>
    </button>
  )
}

const md = (d) => `${d.getMonth() + 1}/${d.getDate()}`

/** 한 줄 약속: 왼쪽 타일(날짜 또는 입력 현황) + 제목 · 설명 + 오른쪽 */
function Row({ href, tileTop, tileMain, title, meta, tag, end }) {
  return (
    <li className="flex items-center gap-1 border-b border-rule2 last:border-0">
      <a href={href} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 text-ink no-underline">
        <span className="grid w-12 shrink-0 place-items-center rounded-[12px] bg-pen-soft py-1 leading-tight text-accent">
          <span className="text-[11px] font-semibold">{tileTop}</span>
          <span className="text-[17px] font-extrabold tabular">{tileMain}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-semibold">{title}</span>
            {tag && <span className="shrink-0 rounded-full bg-maybe-soft px-1.5 text-[11px] font-bold leading-[18px] text-ink">{tag}</span>}
          </span>
          <span className="block truncate text-[13px] text-ink2">{meta}</span>
        </span>
      </a>
      {end}
    </li>
  )
}

/**
 * 홈: [내가 칠할 약속 카드] → 다가오는 약속 → 조율 중, 모두 한 줄씩.
 * '새 약속 만들기'는 아래(모바일) / 제목 옆(PC)에 늘 있고, 내 일정·친구는 하단 탭으로 가요.
 */
export default function Home({ session }) {
  const toast = useToast()
  const uid = session.user.id
  const [list, setList] = useState(null)
  const [entered, setEntered] = useState(null) // 내가 칠한 약속 id 모음
  async function remove(m) {
    try {
      await deleteMeeting(m.id)
      setList((l) => l.filter((x) => x.id !== m.id))
      toast(`‘${m.title}’을 삭제했어요`)
    } catch (e) {
      toast(e.message)
    }
  }
  const trash = (m) => (m.owner === uid ? <RowDelete onConfirm={() => remove(m)} /> : null)
  useEffect(() => {
    fetchMyMeetings().then(setList)
    fetchMyEntries(uid).then(setEntered)
  }, [uid])

  const now = useMemo(() => new Date(), [])
  const upcoming = useMemo(
    () => (list || []).map((m) => ({ m, t: confirmedTime(m) })).filter((x) => x.t && x.t.end > now).sort((a, b) => a.t.start - b.t.start).slice(0, 3),
    [list, now],
  )
  const ongoing = useMemo(
    () => (list || []).filter((m) => !confirmedTime(m) && meetingSpan(m).end >= new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)),
    [list, now],
  )
  // 아직 내가 칠하지 않은 조율 중 약속 (입력 정보를 못 불러오면 비워 둬요)
  const todo = entered ? ongoing.filter((m) => !entered.has(m.id)) : []
  const first = todo[0]
  const rest = ongoing.filter((m) => m !== first).slice(0, 6)

  return (
    <div className="flex flex-col gap-5 pb-20 md:pb-4">
      <div className="mt-2 flex items-end justify-between gap-3">
        <h1 className="m-0 text-[24px] font-extrabold leading-snug tracking-[-.02em]">
          {displayName(session.user)}님,
          <br />
          {todo.length ? `칠할 약속이 ${todo.length}개 있어요` : '어떤 약속을 잡아 볼까요?'}
        </h1>
        <a href="/?page=new" className="btn-primary hidden shrink-0 no-underline md:inline-flex">+ 새 약속 만들기</a>
      </div>

      {first && (
        <section className="flex flex-col gap-1 rounded-md bg-pen-soft p-4" aria-label="내가 칠할 약속">
          <span className="flex items-center gap-1">
            <span className="min-w-0 flex-1 text-[13px] font-semibold text-accent">내 시간 입력 필요 · {first.participants?.[0]?.count ?? 0}명 참여{first.owner === uid ? ' · 내가 만듦' : ''}</span>
            {trash(first)}
          </span>
          <a href={`/?m=${first.id}`} className="truncate text-[19px] font-extrabold text-ink no-underline">{first.title}</a>
          <span className="text-[13px] text-ink2">{md(meetingSpan(first).start)}–{md(meetingSpan(first).end)}</span>
          <a href={`/?m=${first.id}`} className="btn-primary mt-2 no-underline">시간 칠하기</a>
        </section>
      )}

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
        <section aria-labelledby="h-upcoming">
          <div className="mb-1.5 flex items-center justify-between">
            <h2 id="h-upcoming" className="m-0 text-[15px] font-bold text-ink2">다가오는 약속</h2>
          </div>
          <ul className="sheet m-0 list-none !py-1">
            {list === null && <li className="py-2.5 text-[13px] text-ink2">불러오는 중…</li>}
            {list !== null && !upcoming.length && <li className="py-2.5 text-[13px] text-ink2">확정된 약속이 아직 없어요.</li>}
            {upcoming.map(({ m, t }) => (
              <Row
                key={m.id}
                href={`/?m=${m.id}`}
                tileTop={`${t.start.getMonth() + 1}월`}
                tileMain={t.start.getDate()}
                title={m.title}
                meta={`(${DAYS[t.start.getDay()]}) ${t.open ? `${hm(t.start)}부터` : `${hm(t.start)}–${hm(t.end)}`}${m.place?.name ? ` · ${m.place.name}` : ''}`}
                end={trash(m)}
              />
            ))}
          </ul>
        </section>

        <section aria-labelledby="h-ongoing">
          <h2 id="h-ongoing" className="m-0 mb-1.5 text-[15px] font-bold text-ink2">조율 중</h2>
          <ul className="sheet m-0 list-none !py-1">
            {list === null && <li className="py-2.5 text-[13px] text-ink2">불러오는 중…</li>}
            {list !== null && !rest.length && (
              <li className="py-2.5 text-[13px] text-ink2">{first ? '다른 조율 중인 약속은 없어요.' : '조율 중인 약속이 없어요.'}</li>
            )}
            {rest.map((m) => {
              const s = meetingSpan(m)
              const mine = entered?.has(m.id)
              return (
                <Row
                  key={m.id}
                  href={`/?m=${m.id}`}
                  tileTop="참여"
                  tileMain={`${m.participants?.[0]?.count ?? 0}명`}
                  title={m.title}
                  meta={`${md(s.start)}–${md(s.end)}${m.owner === uid ? ' · 내가 만듦' : ''}`}
                  tag={entered && !mine ? '입력 전' : null}
                  end={trash(m)}
                />
              )
            })}
          </ul>
        </section>
      </div>

      <InstallApp />
      <KakaoLink user={session.user} />

      <div className="flex justify-center gap-4 text-[13px] text-ink2">
        <a href="/?page=feedback" className="text-ink2 underline underline-offset-2 hover:text-ink">의견 보내기</a>
        <a href="/?page=privacy" className="text-ink2 underline underline-offset-2 hover:text-ink">개인정보처리방침</a>
      </div>

      {/* 모바일: 하단 탭 바로 위에 늘 떠 있는 새 약속 버튼 */}
      <div className="pointer-events-none fixed inset-x-0 z-20 px-4 md:hidden" style={{ bottom: 'calc(66px + env(safe-area-inset-bottom, 0px))' }}>
        <a href="/?page=new" className="btn-primary btn-lg pointer-events-auto mx-auto flex max-w-[560px] no-underline shadow-float">+ 새 약속 만들기</a>
      </div>
    </div>
  )
}
