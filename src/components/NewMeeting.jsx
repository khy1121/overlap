import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { iso, nextMonday } from '../lib/schedule'
import { useToast } from '../hooks/useToast'
import Avatar from './Avatar'
import DurationPicker from './DurationPicker'
import PageHeader from './PageHeader'

const HOURS = Array.from({ length: 25 }, (_, h) => h)
const MAX_DAYS = 14
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }
const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000) + 1

/** 새 약속 만들기 페이지 (/?page=new) */
export default function NewMeeting() {
  const toast = useToast()
  const [form, setForm] = useState(() => {
    const start = nextMonday()
    return { title: '', start, end: addDays(start, 6), count: 4, from: 9, to: 21, dur: 2 }
  })
  const [busy, setBusy] = useState(false)
  const [friends, setFriends] = useState(null)
  const [picked, setPicked] = useState(() => new Set())
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    supabase.rpc('my_friends').then(({ data, error }) => setFriends(error ? [] : data))
  }, [])

  const days = form.start && form.end ? daysBetween(form.start, form.end) : 0
  const windowSlots = (Number(form.to) - Number(form.from)) * 2
  const maxDur = Math.max(1, Math.min(24, windowSlots))

  function setStart(e) {
    const start = e.target.value
    setForm((f) => {
      // 시작일을 바꾸면 기간 길이는 유지하고 종료일을 따라 옮겨요
      const len = f.start && f.end ? Math.max(0, daysBetween(f.start, f.end) - 1) : 6
      return { ...f, start, end: start ? addDays(start, Math.min(len, MAX_DAYS - 1)) : f.end }
    })
  }
  const toggle = (id) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  async function create(e) {
    e.preventDefault()
    const from = Number(form.from)
    const to = Number(form.to)
    if (days < 1) return toast('종료일은 시작일과 같거나 뒤여야 해요')
    if (days > MAX_DAYS) return toast(`기간은 최대 ${MAX_DAYS}일까지 정할 수 있어요`)
    if (from >= to) return toast('끝 시간은 시작 시간보다 늦어야 해요')
    if (form.dur > windowSlots) return toast('만나는 시간이 하루 시간대보다 길어요')
    setBusy(true)
    const args = {
      p_title: form.title,
      p_start: form.start,
      p_from: from,
      p_to: to,
      p_dur: form.dur,
      p_expected: Math.max(1, Math.min(50, Number(form.count) || 4)),
    }
    // 7일이 아닐 때만 기간을 보내요 (서버 업데이트 전에도 기본 7일 약속은 만들 수 있게)
    if (days !== 7) args.p_days = days
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

  const label = 'flex flex-col gap-1.5 text-[13px] font-medium text-ink2'
  const head = 'text-[13px] font-medium text-ink2'
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <PageHeader title="새 약속 만들기" sub="팀 회의도, 친구 모임도 좋아요. 기간과 시간대를 정하면 함께 칠할 시간표가 만들어져요." />
      <form className="flex flex-col gap-4" onSubmit={create}>
        <section className="sheet flex flex-col gap-4">
          <label className={label}>
            약속 이름
            <input className="field-input" maxLength={40} placeholder="예: 금요일 저녁 모임, 3주차 팀 회의" required autoFocus value={form.title} onChange={set('title')} />
          </label>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className={head}>기간</span>
              <span className={`text-[13px] font-semibold ${days >= 1 && days <= MAX_DAYS ? 'text-accent' : 'text-no'}`}>
                {days >= 1 ? `${days}일` : '날짜를 확인해 주세요'}
              </span>
            </div>
            {/* 좁은 화면에서는 날짜가 잘리지 않게 위아래로 */}
            <div className="grid grid-cols-1 gap-2 min-[440px]:grid-cols-2">
              <label className="flex items-center gap-2 text-[13px] text-ink2">
                <span className="w-8 shrink-0">시작</span>
                <input className="field-input min-w-0 flex-1" type="date" aria-label="시작일" required value={form.start} onChange={setStart} />
              </label>
              <label className="flex items-center gap-2 text-[13px] text-ink2">
                <span className="w-8 shrink-0">종료</span>
                <input className="field-input min-w-0 flex-1" type="date" aria-label="종료일" required min={form.start} max={form.start ? addDays(form.start, MAX_DAYS - 1) : undefined} value={form.end} onChange={set('end')} />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className={label}>
              하루 중 시작
              <select className="field-input" value={form.from} onChange={set('from')}>
                {HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{h}시</option>)}
              </select>
            </label>
            <label className={label}>
              하루 중 끝
              <select className="field-input" value={form.to} onChange={set('to')}>
                {HOURS.slice(1).map((h) => <option key={h} value={h}>{h}시</option>)}
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className={head}>얼마나 만날까요</span>
            <DurationPicker value={form.dur} max={maxDur} onChange={(dur) => setForm((f) => ({ ...f, dur }))} />
          </div>

          <label className={label}>
            예상 인원
            <input className="field-input" type="number" min={1} max={50} inputMode="numeric" value={form.count} onChange={set('count')} />
          </label>
        </section>

        <section className="sheet flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[15px] font-bold">친구 초대</span>
            {friends?.length > 0 && (
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => setPicked(picked.size === friends.length ? new Set() : new Set(friends.map((f) => f.user_id)))}
              >
                {picked.size === friends.length ? '모두 해제' : '모두 선택'}
              </button>
            )}
          </div>
          {friends === null && <p className="m-0 text-[13px] text-ink2">친구 목록을 불러오는 중…</p>}
          {friends?.length === 0 && (
            <p className="m-0 text-[13px] text-ink2">
              저장된 친구가 없어요. 만든 뒤 링크로 초대하거나, <a href="/?page=friends" className="font-semibold text-accent">친구</a>에서 코드로 추가해 보세요.
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
          <p className="m-0 text-[13px] text-ink2">링크·이메일 초대는 약속을 만든 뒤 바로 할 수 있어요.</p>
        </section>

        <button className="btn-primary btn-lg" type="submit" disabled={busy}>
          {busy ? '만드는 중…' : picked.size ? `약속 만들고 친구 ${picked.size}명 초대하기` : '약속 만들기'}
        </button>
      </form>
    </div>
  )
}
