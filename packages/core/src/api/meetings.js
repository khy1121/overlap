// 약속 목록·삭제·나가기와 확정 시간 계산.
// 조회 함수는 Supabase 클라이언트(db)를 첫 인자로 받아요: 웹과 앱이 각자 만든 클라이언트를 넘겨요.

// '*'로 읽어서, 새 칸(days 등)이 DB에 아직 없어도 깨지지 않게
const COLS = '*,participants(count)'

/** 내가 만들었거나 참여한 약속 (RLS가 멤버인 약속만 돌려줘요). 못 불러오면 [] */
export async function fetchMyMeetings(db) {
  const { data, error } = await db.from('meetings').select(COLS).order('created_at', { ascending: false }).limit(200)
  return error ? [] : data
}

/** 내가 일정을 칠한 약속 id 모음 (홈의 '칠할 약속' 표시용). 못 불러오면 null */
export async function fetchMyEntries(db, uid) {
  const { data, error } = await db.from('participants').select('meeting_id,cells').eq('user_id', uid)
  if (error) return null
  return new Set(data.filter((p) => p.cells && Object.keys(p.cells).length > 0).map((p) => p.meeting_id))
}

/** 약속 삭제 (만든 사람만, RLS). 참여자 일정도 함께 지워져요(on delete cascade). */
export async function deleteMeeting(db, mid) {
  const { error, count } = await db.from('meetings').delete({ count: 'exact' }).eq('id', mid)
  if (error) throw new Error('약속을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.')
  if (!count) throw new Error('약속은 만든 사람만 삭제할 수 있어요.')
}

/** 약속 나가기: 내 참여 행(일정 포함)을 지워요. 만든 사람은 나갈 수 없고 삭제만 돼요. */
export async function leaveMeeting(db, mid, uid) {
  const { error, count } = await db.from('participants').delete({ count: 'exact' }).eq('meeting_id', mid).eq('user_id', uid)
  if (error) throw new Error('약속에서 나가지 못했어요. 잠시 후 다시 시도해 주세요.')
  if (!count) throw new Error('이 약속에 참여하고 있지 않아요.')
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
  // 칸 인덱스는 시간표 첫 행 기준 (schedule.js rowFrom과 같은 규칙)
  const first = Math.min(m.from_hour, m.start_hour ?? m.from_hour)
  const start = new Date(day.getFullYear(), day.getMonth(), day.getDate() + p.d, 0, first * 60 + p.s * 30)
  return { start, end: new Date(start.getTime() + (p.dur || 2) * 30 * 60000), open: !p.dur }
}

/** 조율 중인 약속의 기간(시작일~종료일) */
export function meetingSpan(m) {
  const s = startOf(m)
  return { start: s, end: new Date(s.getFullYear(), s.getMonth(), s.getDate() + (m.days || 7) - 1) }
}

export const hm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

/** Google 캘린더 '일정 추가' 화면 링크 (추가 권한 없이 사용자가 직접 저장). origin = 약속 링크의 기준 주소 */
export function googleAddLink(m, t, origin) {
  const f = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const q = new URLSearchParams({
    action: 'TEMPLATE',
    text: m.title,
    dates: `${f(t.start)}/${f(t.end)}`,
    details: `Overlap에서 정한 약속이에요.\n${origin}/?m=${m.id}`,
  })
  // 만날 장소를 정했으면 캘린더 위치에도 넣어요
  if (m.place?.name) q.set('location', [m.place.name, m.place.address].filter(Boolean).join(' · '))
  return `https://calendar.google.com/calendar/render?${q}`
}
