import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { nextMonday } from '../lib/schedule'
import { useToast } from '../hooks/useToast'
import PageHeader from './PageHeader'

const HOURS = Array.from({ length: 25 }, (_, h) => h)

/** 새 회의 만들기 페이지 (/?page=new) */
export default function NewMeeting() {
  const toast = useToast()
  const [form, setForm] = useState({ title: '', start: nextMonday(), count: 4, from: 9, to: 21, dur: 2 })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function create(e) {
    e.preventDefault()
    const from = Number(form.from)
    const to = Number(form.to)
    if (from >= to) return toast('끝 시간은 시작 시간보다 늦어야 해요')
    setBusy(true)
    const { data, error } = await supabase.rpc('create_meeting', {
      p_title: form.title,
      p_start: form.start,
      p_from: from,
      p_to: to,
      p_dur: Number(form.dur),
      p_expected: Math.max(1, Math.min(50, Number(form.count) || 4)),
    })
    setBusy(false)
    if (error) return toast(`회의를 만들지 못했어요: ${error.message}`)
    window.location.href = `/?m=${data}&new=1`
  }

  const label = 'flex flex-col gap-1.5 text-[13px] font-medium text-ink2'
  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-4">
      <PageHeader title="새 회의 만들기" sub="기간과 시간대를 정하면, 사람들이 되는 시간을 칠할 시간표가 만들어져요." />
      <form className="sheet flex flex-col gap-4" onSubmit={create}>
        <label className={label}>
          회의 이름
          <input className="field-input" maxLength={40} placeholder="예: 3주차 팀 회의" required autoFocus value={form.title} onChange={set('title')} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            시작일 (7일간)
            <input className="field-input" type="date" required value={form.start} onChange={set('start')} />
          </label>
          <label className={label}>
            예상 인원
            <input className="field-input" type="number" min={1} max={50} inputMode="numeric" value={form.count} onChange={set('count')} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            시작 시간
            <select className="field-input" value={form.from} onChange={set('from')}>
              {HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{h}시</option>)}
            </select>
          </label>
          <label className={label}>
            끝 시간
            <select className="field-input" value={form.to} onChange={set('to')}>
              {HOURS.slice(1).map((h) => <option key={h} value={h}>{h}시</option>)}
            </select>
          </label>
        </div>
        <label className={label}>
          회의 길이
          <select className="field-input" value={form.dur} onChange={set('dur')}>
            <option value={1}>30분</option>
            <option value={2}>1시간</option>
            <option value={3}>1시간 30분</option>
            <option value={4}>2시간</option>
            <option value={6}>3시간</option>
          </select>
        </label>
        <button className="btn-primary btn-lg mt-1" type="submit" disabled={busy}>
          {busy ? '만드는 중…' : '회의 만들고 사람들 초대하기'}
        </button>
      </form>
    </div>
  )
}
