import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nextMonday } from '../lib/schedule'
import { useToast } from '../hooks/useToast'

const HOURS = Array.from({ length: 25 }, (_, h) => h)

export default function Home({ session }) {
  const toast = useToast()
  const [form, setForm] = useState({ title: '', start: nextMonday(), count: 4, from: 9, to: 21, dur: 2 })
  const [busy, setBusy] = useState(false)
  const [list, setList] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    supabase
      .from('meetings')
      .select('id,title,start_date,owner,created_at,participants(count)')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => setList(error ? [] : data))
  }, [])

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

  const label = 'flex flex-col gap-1 text-[13px] text-ink2'
  return (
    <div className="grid items-start gap-5 md:grid-cols-2">
      <section className="sheet">
        <h2 className="mb-3 mt-0 font-display text-lg font-extrabold">새 회의 만들기</h2>
        <form className="flex flex-col gap-3" onSubmit={create}>
          <label className={label}>
            회의 이름
            <input className="field-input" maxLength={40} placeholder="예: 3주차 팀 회의" required value={form.title} onChange={set('title')} />
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <label className={label}>
              시작일 (7일간)
              <input className="field-input" type="date" required value={form.start} onChange={set('start')} />
            </label>
            <label className={label}>
              예상 인원
              <input className="field-input" type="number" min={1} max={50} inputMode="numeric" value={form.count} onChange={set('count')} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
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
          <button className="btn-primary min-h-[42px] text-sm" type="submit" disabled={busy}>
            회의 만들고 사람들 초대하기
          </button>
        </form>
      </section>

      <section className="sheet">
        <h2 className="mb-3 mt-0 font-display text-lg font-extrabold">내 회의</h2>
        <ul className="m-0 list-none border-t border-rule p-0">
          {list === null && <li className="px-1 py-2.5 text-[13px] text-ink2">불러오는 중…</li>}
          {list?.length === 0 && <li className="px-1 py-2.5 text-[13px] text-ink2">아직 회의가 없어요. 왼쪽에서 첫 회의를 만들어 보세요.</li>}
          {list?.map((m) => (
            <li key={m.id} className="border-b border-rule2">
              <a href={`/?m=${m.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2.5 gap-y-0.5 px-1 py-2.5 text-ink no-underline hover:bg-paper">
                <span className="font-semibold">{m.title}</span>
                <span className="font-mono text-[11px] text-ink2">{m.owner === session.user.id ? '내가 만듦' : '참여 중'}</span>
                <span className="col-span-2 text-xs text-ink2">
                  {Number(m.start_date.slice(5, 7))}/{Number(m.start_date.slice(8, 10))}부터 7일 · {m.participants?.[0]?.count ?? 0}명 참여
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
