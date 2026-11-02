import { supabase } from './supabase'

const COLS = 'id,title,start_date,from_hour,to_hour,dur,picked,owner,created_at,participants(count)'

/** 내가 만들었거나 참여한 회의 (RLS가 멤버인 회의만 돌려줘요) */
export async function fetchMyMeetings() {
  const { data, error } = await supabase.from('meetings').select(COLS).order('created_at', { ascending: false }).limit(200)
  return error ? [] : data
}

const startOf = (m) => {
  const [y, mo, d] = m.start_date.split('-').map(Number)
  return new Date(y, mo - 1, d)
}

/** 확정된 회의 시간 → { start, end } (확정 전이면 null) */
export function confirmedTime(m) {
  const p = m.picked
  if (!p || p.d > 6) return null
  const day = startOf(m)
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate() + p.d, 0, m.from_hour * 60 + p.s * 30)
  return { start, end: new Date(start.getTime() + p.dur * 30 * 60000) }
}

/** 조율 중인 회의의 기간(7일) */
export function meetingSpan(m) {
  const s = startOf(m)
  return { start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 6) }
}

export const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** Google 캘린더 '일정 추가' 화면 링크 (추가 권한 없이 사용자가 직접 저장) */
export function googleAddLink(m, t) {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: m.title,
    dates: `${f(t.start)}/${f(t.end)}`,
    details: `Overlap에서 정한 약속이에요.\n${window.location.origin}/?m=${m.id}`,
  })
  return `https://calendar.google.com/calendar/render?${q}`
}
