// 새 약속 만들기와 약속 설정에서 같이 쓰는 빠른 선택 (기간·시간대)
import { iso, nextMonday } from './schedule'

const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }
export const daysBetween = (a, b) => Math.round((parse(b) - parse(a)) / 86400000) + 1

/** 자주 쓰는 기간. 오늘 기준으로 [시작, 끝] 날짜 */
export function datePresets() {
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
export const TIME_PRESETS = [
  { key: 'day', label: '낮', sub: '9–18시', from: 9, to: 18 },
  { key: 'eve', label: '저녁', sub: '18–23시', from: 18, to: 23 },
  { key: 'all', label: '종일', sub: '9–22시', from: 9, to: 22 },
]

export const chip = (on) =>
  `inline-flex min-h-[40px] items-center gap-1 rounded-full border-0 px-4 text-sm font-semibold transition-colors ${on ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`

export const tile = (on) =>
  `flex min-h-[56px] flex-col items-center justify-center rounded-[14px] border-0 text-sm font-bold ${on ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`
