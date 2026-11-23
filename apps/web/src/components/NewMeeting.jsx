import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MAX_DAYS, durText, nSlots, rangeError, rangeText } from '@overlap/core/schedule'
import { TIME_PRESETS, addDays, chip, datePresets, daysBetween, tile } from '../lib/presets'
import { useToast } from '../hooks/useToast'
import Avatar from './Avatar'
import DurationPicker from './DurationPicker'
import PageHeader from './PageHeader'

const HOURS = Array.from({ length: 25 }, (_, h) => h)
const TITLE_IDEAS = ['팀 회의', '스터디', '저녁 약속', '점심 약속', '동아리 모임', '조별 과제']

/** 새 약속 만들기 페이지 (/?page=new): 단계별로 빠른 선택 → 필요하면 직접 정하기 */
export default function NewMeeting() {
  const toast = useToast()
  const presets = datePresets()
  const [form, setForm] = useState(() => {
    const next = presets.find((p) => p.key === 'next')
    // from/to: 하루 시간대. split이면 첫날 시작(startHour)·마지막 날 끝(endHour)을 따로 정해요
    return { title: '', start: next.start, end: next.end, from: 9, to: 22, split: false, startHour: 9, endHour: 22, dur: 2, count: 4 }
  })
  const [customDate, setCustomDate] = useState(false)
  const [customTime, setCustomTime] = useState(false)
  const [countTouched, setCountTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  // 화면 안에서 바로 보이는 안내 (토스트는 아래 고정 바에 가려질 수 있어서)
  const [titleErr, setTitleErr] = useState(false)
  const [submitErr, setSubmitErr] = useState('')
  const titleRef = useRef(null)
  const [friends, setFriends] = useState(null)
  const [picked, setPicked] = useState(() => new Set())
  const patch = (p) => setForm((f) => ({ ...f, ...p }))

  useEffect(() => {
    supabase.rpc('my_friends').then(({ data, error }) => setFriends(error ? [] : data))
  }, [])

  const days = form.start && form.end ? daysBetween(form.start, form.end) : 0
  const one = days === 1
  const split = form.split && !one
  const from = Number(form.from)
  const to = Number(form.to)
  // schedule.js 계산 함수에 넣는 모양. 하루짜리거나 따로 정하지 않으면 시간대가 곧 첫날·마지막 날 시각이에요
  const cfg = {
    start: form.start,
    days,
    from,
    to,
    startHour: split ? Number(form.startHour) : from,
    endHour: split ? Number(form.endHour) : to,
    dur: form.dur,
  }
  const err = days >= 1 ? rangeError(cfg) : '날짜를 확인해 주세요'
  const maxDur = Math.max(1, Math.min(24, nSlots(cfg) || 1))
  const datePreset = customDate ? null : presets.find((p) => p.start === form.start && p.end === form.end)
  const timePreset = customTime || split ? null : TIME_PRESETS.find((p) => p.from === from && p.to === to)

  function setStart(e) {
    const start = e.target.value
    setForm((f) => {
      // 시작일을 바꾸면 기간 길이는 유지하고 끝 날짜를 따라 옮겨요
      const len = f.start && f.end ? Math.max(0, daysBetween(f.start, f.end) - 1) : 6
      return { ...f, start, end: start ? addDays(start, Math.min(len, MAX_DAYS - 1)) : f.end }
    })
  }
  function toggle(id) {
    setPicked((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      // 인원을 직접 바꾸지 않았다면 '나 + 고른 친구' 이상으로 맞춰요
      if (!countTouched) setForm((f) => ({ ...f, count: Math.max(4, n.size + 1) }))
      return n
    })
  }

  async function create(e) {
    e.preventDefault()
    setSubmitErr('')
    if (!form.title.trim()) {
      setTitleErr(true)
      titleRef.current?.focus()
      return
    }
    if (err) return toast(err)
    setBusy(true)
    const args = {
      p_title: form.title.trim(),
      p_start: form.start,
      p_from: one ? cfg.startHour : cfg.from,
      p_to: one ? cfg.endHour : cfg.to,
      p_dur: form.dur,
      p_expected: Math.max(1, Math.min(50, Number(form.count) || 4)),
      p_days: days,
      p_start_hour: cfg.startHour,
      p_end_hour: cfg.endHour,
    }
    const { data: mid, error } = await supabase.rpc('create_meeting', args)
    if (error) {
      setBusy(false)
      const outdated = /function|p_days|dur_check|null value/i.test(error.message)
      const msg = outdated ? '서버 업데이트가 아직이라 이 설정(기간·만나는 시간)으로는 만들 수 없어요.' : `약속을 만들지 못했어요: ${error.message}`
      setSubmitErr(msg)
      return toast(msg)
    }
    // 고른 친구를 바로 초대
    const ids = [...picked]
    const results = await Promise.all(ids.map((target) => supabase.rpc('invite_friend', { mid, target })))
    const failed = results.filter((r) => r.error).length
    // 초대 실패 수는 약속 화면 안내에 함께 보여요 (바로 이동해서 여기 토스트는 안 보여요)
    window.location.href = `/?m=${mid}&new=1${ids.length - failed ? `&invited=${ids.length - failed}` : ''}${failed ? `&failed=${failed}` : ''}`
  }

  const hourSelect = (label, value, first, onPick) => (
    <select className="field-input w-[92px] shrink-0" aria-label={label} value={value} onChange={(e) => onPick(Number(e.target.value))}>
      {HOURS.slice(first, first + 24).map((h) => <option key={h} value={h}>{h}시</option>)}
    </select>
  )

  // 질문 오른쪽에 보여 줄 짧은 값
  const md = (s) => s ? `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}` : ''
  const dateAside = days >= 1 && days <= MAX_DAYS ? (one ? md(form.start) : `${md(form.start)}–${md(form.end)}`) : null
  const timeAside = split ? `첫날 ${form.startHour}시 ~ 마지막 날 ${form.endHour}시` : `${from}–${to}시`
  const scrollRow = '-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
  const setCount = (c) => { setCountTouched(true); patch({ count: Math.max(1, Math.min(50, c)) }) }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-3">
      <PageHeader title="새 약속" />
      {/* 질문 5개를 한 줄 제목 + 칩 한 줄로. 고른 값은 제목 오른쪽에 보여요 (스크롤 없이 한 화면) */}
      <form className="flex flex-col gap-5 pb-36" onSubmit={create}>
        <Q title="무슨 약속이에요?">
          <input
            ref={titleRef}
            className={`field-input text-[16px] ${titleErr ? '!border-no' : ''}`}
            maxLength={40}
            placeholder="약속 이름"
            autoFocus
            value={form.title}
            onChange={(e) => { patch({ title: e.target.value }); setTitleErr(false) }}
            aria-label="약속 이름"
            aria-invalid={titleErr}
            aria-describedby={titleErr ? 'title-err' : undefined}
          />
          {titleErr && <p id="title-err" className="m-0 text-[13px] font-semibold text-no" role="alert">약속 이름을 정해 주세요. 아래 추천을 눌러도 돼요.</p>}
          <div className={scrollRow}>
            {TITLE_IDEAS.map((t) => (
              <button key={t} type="button" className={`${chip(form.title === t)} !min-h-[32px] shrink-0 !px-3 !text-[13px]`} onClick={() => patch({ title: t })}>{t}</button>
            ))}
          </div>
        </Q>

        <Q title="언제쯤?" aside={dateAside}>
          <div className={scrollRow}>
            {presets.map((p) => (
              <button key={p.key} type="button" aria-pressed={datePreset?.key === p.key} className={`${chip(datePreset?.key === p.key)} shrink-0`} onClick={() => { setCustomDate(false); patch({ start: p.start, end: p.end }) }}>
                {p.label}
              </button>
            ))}
            <button type="button" aria-pressed={!datePreset} className={`${chip(!datePreset)} shrink-0`} onClick={() => setCustomDate(true)}>직접</button>
          </div>
          {!datePreset && (
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink2">
                시작 날짜
                <input className="field-input" type="date" required value={form.start} onChange={setStart} />
              </label>
              <label className="flex flex-col gap-1 text-xs font-semibold text-ink2">
                끝 날짜
                <input className="field-input" type="date" required min={form.start} max={form.start ? addDays(form.start, MAX_DAYS - 1) : undefined} value={form.end} onChange={(e) => patch({ end: e.target.value })} />
              </label>
            </div>
          )}
        </Q>

        <Q title="몇 시쯤?" aside={timeAside}>
          <div className={scrollRow}>
            {TIME_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={timePreset?.key === p.key}
                className={`${chip(timePreset?.key === p.key)} shrink-0`}
                onClick={() => { setCustomTime(false); patch({ from: p.from, to: p.to, split: false }) }}
              >
                {p.label}
                <span className="text-[12px] font-medium opacity-75">{p.sub}</span>
              </button>
            ))}
            <button type="button" aria-pressed={!timePreset} className={`${chip(!timePreset)} shrink-0`} onClick={() => setCustomTime(true)}>직접</button>
          </div>
          {!timePreset && (
            <div className="flex flex-col gap-2.5 rounded-[14px] bg-sheet p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink2">
                <span className="text-xs font-semibold">{one ? '시간' : '매일'}</span>
                {hourSelect('시간대 시작', form.from, 0, (h) => patch({ from: h }))}
                부터
                {hourSelect('시간대 끝', form.to, 1, (h) => patch({ to: h }))}
                까지
              </div>
              {!one && (
                <label className="flex items-center gap-2 text-[13px] text-ink2">
                  <input type="checkbox" checked={form.split} onChange={(e) => patch({ split: e.target.checked, startHour: from, endHour: to })} />
                  첫날 시작·마지막 날 끝 시각은 따로 정하기 (예: 오늘 12시 ~ 모레 22시)
                </label>
              )}
              {split && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-ink2">
                  <span className="text-xs font-semibold">첫날</span>
                  {hourSelect('첫날 시작 시각', form.startHour, 0, (h) => patch({ startHour: h }))}
                  부터 · <span className="text-xs font-semibold">마지막 날</span>
                  {hourSelect('마지막 날 끝 시각', form.endHour, 1, (h) => patch({ endHour: h }))}
                  까지
                </div>
              )}
            </div>
          )}
        </Q>

        <Q title="얼마나?" aside={durText(form.dur)}>
          <DurationPicker compact scroll value={form.dur} max={maxDur} onChange={(dur) => patch({ dur })} />
        </Q>

        <Q
          title="누구랑?"
          aside={(
            // 예상 인원(나 포함): 제목 줄 오른쪽 작은 스테퍼
            <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold text-accent" role="group" aria-label="예상 인원 (나 포함)">
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full border-0 bg-transparent text-lg text-ink2 hover:bg-rule2" aria-label="인원 줄이기" onClick={() => setCount(form.count - 1)}>−</button>
              <output className="tabular" aria-live="polite">나 포함 {form.count}명</output>
              <button type="button" className="grid h-11 w-11 place-items-center rounded-full border-0 bg-transparent text-lg text-ink2 hover:bg-rule2" aria-label="인원 늘리기" onClick={() => setCount(form.count + 1)}>+</button>
            </span>
          )}
        >
          {friends === null && <p className="m-0 text-[13px] text-ink2">친구 목록을 불러오는 중…</p>}
          {friends?.length === 0 && <p className="m-0 text-[13px] text-ink2">저장된 친구가 없어요. 만든 뒤 카톡·링크로 초대할 수 있어요.</p>}
          {friends?.length > 0 && (
            <ul className={`m-0 list-none p-0 ${scrollRow}`}>
              {friends.length > 0 && (
                <li className="shrink-0">
                  <button
                    type="button"
                    className="inline-flex min-h-[40px] items-center rounded-full border-0 bg-transparent px-2.5 text-[13px] font-semibold text-accent"
                    onClick={() => {
                      const all = picked.size === friends.length
                      setPicked(all ? new Set() : new Set(friends.map((f) => f.user_id)))
                      if (!countTouched) patch({ count: Math.max(4, (all ? 0 : friends.length) + 1) })
                    }}
                  >
                    {picked.size === friends.length ? '모두 해제' : '모두 선택'}
                  </button>
                </li>
              )}
              {friends.map((f) => {
                const on = picked.has(f.user_id)
                return (
                  <li key={f.user_id} className="shrink-0">
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(f.user_id)}
                      className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border-0 py-1 pl-1 pr-3.5 text-sm font-semibold ${on ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`}
                    >
                      <Avatar name={f.name} size={30} className={on ? '!bg-sheet !text-accent' : '!bg-sheet'} />
                      {f.name || '이름 없음'}
                      {on && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Q>

        {/* 아래 고정: 요약 한 줄 + 만들기 */}
        <div
          className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-[color-mix(in_oklab,var(--sheet)_94%,transparent)] px-4 pt-2.5 backdrop-blur"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="mx-auto flex max-w-[560px] flex-col gap-2">
            {err || submitErr ? (
              <p className="m-0 text-center text-[13px] font-semibold text-no" role="alert">{err || submitErr}</p>
            ) : (
              <p className="tabular m-0 text-center text-[13px] leading-snug text-ink2">
                {rangeText(cfg)}
                <br />
                {days > 2 && `가운데 날 ${from}–${to}시 · `}{durText(form.dur)} · {form.count}명{picked.size ? ` · 친구 ${picked.size}명 바로 초대` : ''}
              </p>
            )}
            <button className="btn-primary btn-lg disabled:opacity-50" type="submit" disabled={busy || Boolean(err)}>
              {busy ? '만드는 중…' : picked.size ? `만들고 친구 ${picked.size}명 초대하기` : '약속 만들기'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

/** 질문 한 덩어리: 제목 줄(오른쪽에 고른 값) + 선택지 */
function Q({ title, aside, children }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex min-h-[32px] items-center gap-2">
        <h2 className="m-0 flex-1 text-[16px] font-bold">{title}</h2>
        {aside && (typeof aside === 'string' ? <span className="text-[13px] font-semibold text-accent">{aside}</span> : aside)}
      </div>
      {children}
    </section>
  )
}
