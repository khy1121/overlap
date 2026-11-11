import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { MAX_DAYS, durText, iso, nSlots, nextMonday, rangeError, rangeText } from '../lib/schedule'
import { useToast } from '../hooks/useToast'
import Avatar from './Avatar'
import DurationPicker from './DurationPicker'
import PageHeader from './PageHeader'

const HOURS = Array.from({ length: 25 }, (_, h) => h)
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000) + 1

const TITLE_IDEAS = ['팀 회의', '스터디', '저녁 약속', '점심 약속', '동아리 모임', '조별 과제']

/** 자주 쓰는 기간. 오늘 기준으로 [시작, 끝] 날짜를 돌려줘요 */
function datePresets() {
  const today = iso(new Date())
  const dow = new Date().getDay() // 0 일 ~ 6 토
  const toSun = (7 - dow) % 7 // 이번 주 일요일까지
  const sat = dow === 0 ? today : addDays(today, (6 - dow + 7) % 7) // 이번 주말 토요일 (일요일이면 오늘)
  const mon = nextMonday()
  return [
    { key: 'today', label: '오늘', start: today, end: today },
    { key: 'tomorrow', label: '내일', start: addDays(today, 1), end: addDays(today, 1) },
    { key: 'weekend', label: '이번 주말', start: sat, end: addDays(today, toSun) },
    { key: 'week', label: '이번 주', start: today, end: addDays(today, toSun) },
    { key: 'next', label: '다음 주', start: mon, end: addDays(mon, 6) },
    { key: 'two', label: '2주', start: today, end: addDays(today, 13) },
  ]
}

/** 자주 쓰는 시간대 */
const TIME_PRESETS = [
  { key: 'day', label: '낮', sub: '9–18시', from: 9, to: 18 },
  { key: 'eve', label: '저녁', sub: '18–23시', from: 18, to: 23 },
  { key: 'all', label: '종일', sub: '9–22시', from: 9, to: 22 },
]

const chip = (on) =>
  `inline-flex min-h-[40px] items-center gap-1 rounded-full border-0 px-4 text-sm font-semibold transition-colors ${on ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`

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
    if (!form.title.trim()) return toast('약속 이름을 정해 주세요')
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
      return toast(outdated ? '서버 업데이트가 아직이라 이 설정(기간·만나는 시간)으로는 만들 수 없어요.' : `약속을 만들지 못했어요: ${error.message}`)
    }
    // 고른 친구를 바로 초대
    const ids = [...picked]
    const results = await Promise.all(ids.map((target) => supabase.rpc('invite_friend', { mid, target })))
    const failed = results.filter((r) => r.error).length
    if (failed) toast(`친구 ${failed}명은 초대하지 못했어요. 약속 화면에서 다시 초대해 주세요.`)
    window.location.href = `/?m=${mid}&new=1${ids.length - failed ? `&invited=${ids.length - failed}` : ''}`
  }

  const hourSelect = (label, value, first, onPick) => (
    <select className="field-input w-[92px] shrink-0" aria-label={label} value={value} onChange={(e) => onPick(Number(e.target.value))}>
      {HOURS.slice(first, first + 24).map((h) => <option key={h} value={h}>{h}시</option>)}
    </select>
  )

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <PageHeader title="새 약속 만들기" sub="빠른 선택으로 정하고, 필요할 때만 자세히 바꿔요." />
      <form className="flex flex-col gap-4" onSubmit={create}>
        {/* 1. 무슨 약속 */}
        <Step n={1} title="무슨 약속인가요?">
          <input className="field-input text-[16px]" maxLength={40} placeholder="약속 이름" autoFocus value={form.title} onChange={(e) => patch({ title: e.target.value })} aria-label="약속 이름" />
          <div className="flex flex-wrap gap-1.5">
            {TITLE_IDEAS.map((t) => (
              <button key={t} type="button" className={`${chip(form.title === t)} !min-h-[32px] !px-3 !text-[13px]`} onClick={() => patch({ title: t })}>{t}</button>
            ))}
          </div>
        </Step>

        {/* 2. 언제쯤 */}
        <Step n={2} title="언제쯤 만날까요?" aside={days >= 1 && days <= MAX_DAYS ? `${days}일` : null}>
          <div className="flex flex-wrap gap-1.5">
            {presets.map((p) => (
              <button key={p.key} type="button" aria-pressed={datePreset?.key === p.key} className={chip(datePreset?.key === p.key)} onClick={() => { setCustomDate(false); patch({ start: p.start, end: p.end }) }}>
                {p.label}
              </button>
            ))}
            <button type="button" aria-pressed={!datePreset} className={chip(!datePreset)} onClick={() => setCustomDate(true)}>직접 정하기</button>
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
        </Step>

        {/* 3. 몇 시쯤 */}
        <Step n={3} title="몇 시쯤이 좋을까요?">
          <div className="grid grid-cols-4 gap-1.5">
            {TIME_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                aria-pressed={timePreset?.key === p.key}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-[14px] border-0 text-sm font-bold ${timePreset?.key === p.key ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`}
                onClick={() => { setCustomTime(false); patch({ from: p.from, to: p.to, split: false }) }}
              >
                {p.label}
                <span className="text-[11px] font-medium opacity-80">{p.sub}</span>
              </button>
            ))}
            <button
              type="button"
              aria-pressed={!timePreset}
              className={`flex min-h-[56px] flex-col items-center justify-center rounded-[14px] border-0 text-sm font-bold ${!timePreset ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`}
              onClick={() => setCustomTime(true)}
            >
              직접
              <span className="text-[11px] font-medium opacity-80">시간 고르기</span>
            </button>
          </div>
          {!timePreset && (
            <div className="flex flex-col gap-2.5 rounded-[14px] border border-rule2 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm text-ink2">
                <span className="basis-full text-xs font-semibold">{one ? '시간' : '매일'}</span>
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
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-ink2">
                    <span className="basis-full text-xs font-semibold">첫날</span>
                    {hourSelect('첫날 시작 시각', form.startHour, 0, (h) => patch({ startHour: h }))}
                    부터
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-ink2">
                    <span className="basis-full text-xs font-semibold">마지막 날</span>
                    {hourSelect('마지막 날 끝 시각', form.endHour, 1, (h) => patch({ endHour: h }))}
                    까지
                  </div>
                </>
              )}
            </div>
          )}
        </Step>

        {/* 4. 얼마나 */}
        <Step n={4} title="얼마나 만날까요?" aside={durText(form.dur)}>
          <DurationPicker compact value={form.dur} max={maxDur} onChange={(dur) => patch({ dur })} />
        </Step>

        {/* 5. 누구랑 */}
        <Step
          n={5}
          title="누구랑 만나요?"
          aside={friends?.length > 0 ? (
            <button
              type="button"
              className="btn-ghost btn-sm !min-h-0"
              onClick={() => {
                const all = picked.size === friends.length
                setPicked(all ? new Set() : new Set(friends.map((f) => f.user_id)))
                if (!countTouched) patch({ count: Math.max(4, (all ? 0 : friends.length) + 1) })
              }}
            >
              {picked.size === friends.length ? '모두 해제' : '모두 선택'}
            </button>
          ) : null}
        >
          {friends === null && <p className="m-0 text-[13px] text-ink2">친구 목록을 불러오는 중…</p>}
          {friends?.length === 0 && (
            <p className="m-0 rounded-[12px] bg-rule2 px-3.5 py-3 text-[13px] text-ink2">
              저장된 친구가 없어요. 만든 뒤 바로 카톡·링크로 초대할 수 있어요.
            </p>
          )}
          {friends?.length > 0 && (
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {friends.map((f) => {
                const on = picked.has(f.user_id)
                return (
                  <li key={f.user_id}>
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
          <div className="flex items-center justify-between gap-2 border-t border-rule2 pt-3">
            <span className="text-[13px] text-ink2">예상 인원 <span className="text-xs">(나 포함)</span></span>
            <span className="inline-flex items-center rounded-[12px] bg-rule2" role="group" aria-label="예상 인원">
              <button type="button" className="h-9 w-9 rounded-[12px] border-0 bg-transparent text-lg" aria-label="인원 줄이기" onClick={() => { setCountTouched(true); patch({ count: Math.max(1, form.count - 1) }) }}>−</button>
              <output className="min-w-[44px] text-center text-[15px] font-semibold tabular" aria-live="polite">{form.count}명</output>
              <button type="button" className="h-9 w-9 rounded-[12px] border-0 bg-transparent text-lg" aria-label="인원 늘리기" onClick={() => { setCountTouched(true); patch({ count: Math.min(50, form.count + 1) }) }}>+</button>
            </span>
          </div>
        </Step>

        {/* 요약 + 만들기 */}
        <div className="sticky bottom-[max(12px,env(safe-area-inset-bottom,0px))] z-10 flex flex-col gap-2.5 rounded-[20px] bg-sheet p-4 shadow-soft ring-1 ring-rule">
          {err ? (
            <p className="m-0 text-[13px] font-semibold text-no" role="alert">{err}</p>
          ) : (
            <div className="min-w-0">
              <div className="truncate text-[15px] font-bold">{form.title.trim() || '이름 없는 약속'}</div>
              <div className="tabular mt-0.5 font-mono text-[13px] text-ink">{rangeText(cfg)}</div>
              <div className="text-xs text-ink2">
                {days > 2 && `가운데 날 ${from}–${to}시 · `}{durText(form.dur)} · {form.count}명{picked.size ? ` · 친구 ${picked.size}명 바로 초대` : ''}
              </div>
            </div>
          )}
          <button className="btn-primary btn-lg disabled:opacity-50" type="submit" disabled={busy || Boolean(err)}>
            {busy ? '만드는 중…' : picked.size ? `만들고 친구 ${picked.size}명 초대하기` : '약속 만들기'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Step({ n, title, aside, children }) {
  return (
    <section className="sheet flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pen-soft text-[12px] font-extrabold text-accent">{n}</span>
        <h2 className="m-0 flex-1 text-[16px] font-bold">{title}</h2>
        {aside && (typeof aside === 'string' ? <span className="text-[13px] font-semibold text-accent">{aside}</span> : aside)}
      </div>
      {children}
    </section>
  )
}
