// 시간표 계산. cfg = { start: 'YYYY-MM-DD', days, from, to, dur, count }
// dur: 만나는 시간(30분 칸 수). null이면 '미정' → 시작 시각만 정해요.
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
/** 만나는 시간(30분 칸 수) → '1시간 30분'. 미정이면 '시간 미정' */
export const durText = (dur) => (dur ? [Math.floor(dur / 2) && `${Math.floor(dur / 2)}시간`, dur % 2 && '30분'].filter(Boolean).join(' ') : '시간 미정')
/** 만나는 시간이 미정인지 */
export const isOpenDur = (cfg) => !cfg.dur
/** 계산에 쓰는 길이: 미정이면 시작 칸 하나(30분)로 찾아요 */
export const effDur = (cfg) => cfg.dur || 1

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
/** '14:00–16:00' 또는 (미정) '14:00부터' */
export const timeText = (cfg, s, dur = cfg.dur) => (dur ? `${tm(cfg, s)}–${tm(cfg, s + dur)}` : `${tm(cfg, s)}부터`)
export const whenText = (cfg, w) => `${dayLabel(cfg, w.d)} ${timeText(cfg, w.s)}`
/**
 * 연속으로 되는 전체 구간 안내. 길이를 정했으면 '14:00~18:00 사이 언제든 · 최대 4시간',
 * 미정이면 '최대 4시간까지 가능'. 구간이 추천 길이와 같으면 빈 문자열.
 */
export function spanText(cfg, w) {
  if (!w.span) return ''
  const max = w.span.e - w.span.s
  if (isOpenDur(cfg)) return max > 1 ? `최대 ${durText(max)}까지 가능` : ''
  if (max <= cfg.dur) return ''
  return `${tm(cfg, w.span.s)}~${tm(cfg, w.span.e)} 사이 언제든 · 최대 ${durText(max)}`
}
/** 구간 안에서 고를 수 있는 시작 칸들 (30분 간격) */
export function startChoices(cfg, w) {
  if (!w.span) return [w.s]
  const last = isOpenDur(cfg) ? w.span.e - 1 : w.span.e - cfg.dur
  return Array.from({ length: Math.max(1, last - w.span.s + 1) }, (_, i) => w.span.s + i)
}

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

/**
 * 모두 가능한 시간과 추천 시간 계산.
 * 각 후보에 span(같은 사람들이 연속으로 되는 전체 구간)을 붙이고, 겹치는 구간은 더 좋은 후보 하나만 남겨요.
 */
export function evaluate(cfg, people) {
  const n = Math.max(cfg.count, people.length)
  const missing = n - people.length
  const entered = people.filter(hasInput).length
  if (!entered) return { all: [], rec: [], entered: 0, n }

  const dur = effDur(cfg)
  const slots = nSlots(cfg)
  const byId = Object.fromEntries(people.map((p) => [p.id, p.cells || {}]))
  // 구간을 늘려도 '가능'인 사람은 계속 가능, '조율'인 사람은 계속 가능·조율이어야 같은 추천이에요
  const keeps = (w, d, s) =>
    w.g.y.every((id) => byId[id][`${d}-${s}`] === 'y') && w.g.m.every((id) => ['y', 'm'].includes(byId[id][`${d}-${s}`]))
  const groupsAt = (d, s) => {
    const g = { y: [], m: [], n: [], u: [] }
    people.forEach((p) => g[windowStatus(p.cells || {}, d, s, dur)].push(p.id))
    return g
  }
  // 구간을 앞뒤로 넓히고, 추천 시작은 구간의 시작점으로 맞춰요
  const withSpan = (w) => {
    let a = w.s
    let e = w.s + dur
    while (a > 0 && keeps(w, w.d, a - 1)) a--
    while (e < slots && keeps(w, w.d, e)) e++
    // 사람별 상태(g)·점수는 원래 후보 기준 = 구간 전체에서 보장되는 상태
    return { ...w, s: a, span: { s: a, e } }
  }

  const out = []
  for (let d = 0; d < nDays(cfg); d++) {
    for (let s = 0; s + dur <= slots; s++) {
      const g = groupsAt(d, s)
      out.push({ d, s, g, missing, score: g.y.length * 2 + g.m.length - g.n.length * 3, all: g.y.length === n })
    }
  }

  // 같은 날, 이미 고른(더 좋은) 후보의 구간과 겹치면 빼요 → 서로 다른 시간대만 추천
  const distinct = (list) => {
    const taken = []
    return list.filter((w) => {
      if (taken.some((t) => t.d === w.d && t.span.s < w.span.e && w.span.s < t.span.e)) return false
      taken.push(w)
      return true
    })
  }
  const byTime = (a, b) => a.d - b.d || a.s - b.s
  const nearAfternoon = (w) => Math.abs(cfg.from * 60 + w.s * 30 - 14 * 60) // 오후 2시 근처 선호
  const longer = (a, b) => (b.span.e - b.span.s) - (a.span.e - a.span.s)

  const all = distinct(out.filter((w) => w.all).map(withSpan).sort(byTime))
  const rec = distinct(
    out
      .filter((w) => w.g.y.length + w.g.m.length > 0)
      .map(withSpan)
      .sort((a, b) => b.score - a.score || b.g.y.length - a.g.y.length || longer(a, b) || nearAfternoon(a) - nearAfternoon(b) || byTime(a, b)),
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
