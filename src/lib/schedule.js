// 시간표 계산. cfg = { start: 'YYYY-MM-DD', from, to, dur, count }
// 칸 키는 "요일인덱스-30분칸인덱스" (예: "1-10" = 둘째 날 from+5시간)

export const DAYS = ['일', '월', '화', '수', '목', '금', '토']
export const BRUSH_LABEL = { y: '가능', m: '조율 가능', n: '불가' }

export const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export function nextMonday() {
  const d = new Date()
  const k = (8 - d.getDay()) % 7 || 7
  d.setDate(d.getDate() + k)
  return iso(d)
}

export const nSlots = (cfg) => (cfg.to - cfg.from) * 2
/** 약속 기간(일). 예전 약속은 7일 */
export const nDays = (cfg) => cfg.days || 7
/** 만나는 시간(30분 칸 수) → '1시간 30분' */
export const durText = (dur) => [Math.floor(dur / 2) && `${Math.floor(dur / 2)}시간`, dur % 2 && '30분'].filter(Boolean).join(' ')

export function dayOf(cfg, i) {
  const [y, m, d] = cfg.start.split('-').map(Number)
  return new Date(y, m - 1, d + i)
}
export const md = (cfg, i) => {
  const d = dayOf(cfg, i)
  return `${d.getMonth() + 1}/${d.getDate()}`
}
export const dayLabel = (cfg, i) => `${md(cfg, i)} (${DAYS[dayOf(cfg, i).getDay()]})`
export function tm(cfg, s) {
  const t = cfg.from * 60 + s * 30
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
export const whenText = (cfg, w) => `${dayLabel(cfg, w.d)} ${tm(cfg, w.s)}–${tm(cfg, w.s + cfg.dur)}`

/** 30분 칸의 실제 시각 범위(ms) */
export function slotRange(cfg, d, s) {
  const day = dayOf(cfg, d)
  const st = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, cfg.from * 60 + s * 30)
  return [st.getTime(), st.getTime() + 30 * 60000]
}

/** 회의 길이만큼의 구간에서 한 사람의 상태: y 가능, m 조율, n 불가, u 미입력 */
export function windowStatus(cells, d, s, dur) {
  let worst = 'y'
  for (let k = 0; k < dur; k++) {
    const v = cells[`${d}-${s + k}`]
    if (v === 'n') return 'n'
    if (!v) worst = 'u'
    else if (v === 'm' && worst === 'y') worst = 'm'
  }
  return worst
}

const hasInput = (p) => Object.keys(p.cells || {}).length > 0

/** 모두 가능한 시간과 추천 시간 계산 */
export function evaluate(cfg, people) {
  const n = Math.max(cfg.count, people.length)
  const missing = n - people.length
  const entered = people.filter(hasInput).length
  if (!entered) return { all: [], rec: [], entered: 0, n }

  const out = []
  for (let d = 0; d < nDays(cfg); d++) {
    for (let s = 0; s + cfg.dur <= nSlots(cfg); s++) {
      const g = { y: [], m: [], n: [], u: [] }
      people.forEach((p) => g[windowStatus(p.cells || {}, d, s, cfg.dur)].push(p.id))
      out.push({ d, s, g, missing, score: g.y.length * 2 + g.m.length - g.n.length * 3, all: g.y.length === n })
    }
  }

  const nonOverlap = (list) => {
    const taken = []
    return list.filter((w) => {
      if (taken.some((t) => t.d === w.d && Math.abs(t.s - w.s) < cfg.dur)) return false
      taken.push(w)
      return true
    })
  }
  const byTime = (a, b) => a.d - b.d || a.s - b.s
  const nearAfternoon = (w) => Math.abs(cfg.from * 60 + w.s * 30 - 14 * 60) // 오후 2시 근처 선호

  const all = nonOverlap(out.filter((w) => w.all).sort(byTime))
  const rec = nonOverlap(
    out
      .filter((w) => w.g.y.length + w.g.m.length > 0)
      .sort((a, b) => b.score - a.score || b.g.y.length - a.g.y.length || nearAfternoon(a) - nearAfternoon(b) || byTime(a, b)),
  ).slice(0, 6)

  return { all, rec, entered, n }
}

export function summary(w, n) {
  if (w.all) return `${n}명 모두 가능`
  const parts = [`가능 ${w.g.y.length}`]
  if (w.g.m.length) parts.push(`조율 ${w.g.m.length}`)
  if (w.g.n.length) parts.push(`불가 ${w.g.n.length}`)
  const u = w.g.u.length + w.missing
  if (u) parts.push(`미입력 ${u}`)
  return parts.join(' · ')
}
