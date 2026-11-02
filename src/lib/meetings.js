import { supabase } from './supabase'

// '*'로 읽어서, 새 칸(days)이 DB에 아직 없어도 깨지지 않게
const COLS = '*,participants(count)'

/** 내가 만들었거나 참여한 회의 (RLS가 멤버인 회의만 돌려줘요) */
export async function fetchMyMeetings() {
  const { data, error } = await supabase.from('meetings').select(COLS).order('created_at', { ascending: false }).limit(200)
  return error ? [] : data
}

const startOf = (m) => {
  const [y, mo, d] = m.start_date.split('-').map(Number)
  return new Date(y, mo - 1, d)
}

/** 확정된 약속 시간 → { start, end, open } (확정 전이면 null). open: 만나는 시간 미정(시작만 정함) → end는 1시간 뒤로 표시용 */
export function confirmedTime(m) {
  const p = m.picked
  if (!p || p.d >= (m.days || 7)) return null
  const day = startOf(m)
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate() + p.d, 0, m.from_hour * 60 + p.s * 30)
  return { start, end: new Date(start.getTime() + (p.dur || 2) * 30 * 60000), open: !p.dur }
}

/** 조율 중인 약속의 기간(시작일~종료일) */
export function meetingSpan(m) {
  const s = startOf(m)
  return { start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + (m.days || 7) - 1) }
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
