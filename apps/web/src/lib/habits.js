// 자주 되던 시간: 지난 약속에서 내가 칠한 칸을 요일 × 30분(하루 48칸) 단위로 모아요.
// 내 참여 행만 읽어요(기존 RLS 범위). 서버에 따로 저장하지 않아요.
import { supabase } from './supabase'
import { blocked, dayOf, nDays, nSlots, rowFrom } from '@overlap/core/schedule'

const cfgOf = (m) => ({
  start: m.start_date,
  days: m.days || 7,
  from: m.from_hour,
  to: m.to_hour,
  startHour: m.start_hour ?? null,
  endHour: m.end_hour ?? null,
})

/**
 * 지난 약속(지금 약속 제외)에서 내 응답을 모은 표.
 * 결과: { meetings: 반영한 약속 수, seen[요일][칸], yes[요일][칸] } — 칸은 0시부터 30분 단위(0~47)
 * 못 불러오면 null
 */
export async function fetchMyHabits(uid, exceptMid) {
  const { data: rows, error } = await supabase.from('participants').select('meeting_id,cells').eq('user_id', uid)
  if (error) return null
  const mine = rows.filter((r) => r.meeting_id !== exceptMid && r.cells && Object.keys(r.cells).length)
  if (!mine.length) return { meetings: 0 }
  const { data: ms, error: e2 } = await supabase.from('meetings').select('*').in('id', mine.map((r) => r.meeting_id))
  if (e2) return null
  const byId = Object.fromEntries(ms.map((m) => [m.id, m]))
  const seen = Array.from({ length: 7 }, () => new Array(48).fill(0))
  const yes = Array.from({ length: 7 }, () => new Array(48).fill(0))
  let meetings = 0
  for (const r of mine) {
    const m = byId[r.meeting_id]
    if (!m) continue
    const cfg = cfgOf(m)
    const base = rowFrom(cfg) * 2
    meetings++
    for (let d = 0; d < nDays(cfg); d++) {
      const wd = dayOf(cfg, d).getDay()
      for (let s = 0; s < nSlots(cfg); s++) {
        if (blocked(cfg, d, s)) continue
        const h = base + s
        if (h < 0 || h > 47) continue
        seen[wd][h]++
        const v = r.cells[`${d}-${s}`]
        if (v === 'y') yes[wd][h] += 1
        else if (v === 'm') yes[wd][h] += 0.5
      }
    }
  }
  return { meetings, seen, yes }
}

export { habitCells } from '@overlap/core/habits'
