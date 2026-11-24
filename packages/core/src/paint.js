// 큰 칸 칠하기 (웹·앱 공통): "되는 시간만, 한 번에 여러 칸"
// - 누르기: 돼요 ↔ 빈칸 / 길게 누르기: 애매해요(조율) ↔ 빈칸 / 긋기·줄·빠른 선택: 여러 칸을 한 번에
// - 한 칸이라도 칠한 사람의 빈칸은 '안 돼요'로 계산해요 (schedule.cellStatus). 그래서 '안 돼요'는 따로 칠하지 않아요.
// 저장은 지금처럼 30분 칸 { 'd-s': 'y' | 'm' } 그대로예요.
import { dayOf, nDays } from './schedule.js'
import { keysOf } from './parts.js'

/**
 * 큰 칸 하나의 보이는 상태: 'y' 전부 돼요, 'm' 전부 애매, 'mix' 일부만 칠함, '' 빈칸, 'x' 칠할 수 없는 칸.
 * 예전에 칠한 '안 돼요'(n)는 빈칸과 같아요.
 */
export function paintState(cells, keys) {
  if (!keys.length) return 'x'
  const vals = keys.map((k) => (cells[k] === 'y' || cells[k] === 'm' ? cells[k] : ''))
  const set = new Set(vals)
  if (set.size === 1) return vals[0]
  return 'mix'
}

/** 칸들을 같은 값으로: 'y'·'m'이면 칠하고, 그 밖(null)이면 지워요. 새 객체를 돌려줘요 */
export function fill(cells, keys, value) {
  const next = { ...cells }
  keys.forEach((k) => { if (value === 'y' || value === 'm') next[k] = value; else delete next[k] })
  return next
}

/** 누를 때(또는 긋기를 시작할 때) 칠할 값: 이미 전부 돼요면 지우기, 아니면 돼요 */
export const tapValue = (cells, keys) => (paintState(cells, keys) === 'y' ? null : 'y')

/** 길게 누를 때 칠할 값: 이미 전부 애매면 지우기, 아니면 애매해요 */
export const longValue = (cells, keys) => (paintState(cells, keys) === 'm' ? null : 'm')

/** 칸들의 키를 한 줄로 (요일 줄·시간대 줄·빠른 선택에 써요) */
export const keysOfCells = (cfg, list) => list.flatMap(({ d, part }) => keysOf(cfg, d, part))

/**
 * 빠른 선택 목록: 이 약속에 해당하고, 칠할 칸이 있고, 앞의 것과 겹치지 않는 것만 (순서 = 자주 쓰는 순)
 * 다 돼요 · 평일 저녁 · 주말 · 평일 낮 · 평일만 · 주말 오후 · 저녁만 · 오후만 · 오전만 · 비우기
 */
export function presets(cfg, parts) {
  const days = Array.from({ length: nDays(cfg) }, (_, d) => d)
  const dow = (d) => dayOf(cfg, d).getDay()
  const weekdays = days.filter((d) => dow(d) >= 1 && dow(d) <= 5)
  const weekend = days.filter((d) => dow(d) === 0 || dow(d) === 6)
  const named = (...names) => parts.filter((p) => names.includes(p.label) || names.includes(p.sub))
  // 기본 구분(오전·오후·저녁)이 아니면 앞쪽을 낮, 마지막을 저녁으로 봐요
  const eve = named('저녁', '밤').length ? named('저녁', '밤') : parts.slice(-1)
  const day = named('오전', '오후').length ? named('오전', '오후') : parts.slice(0, -1)
  const cellsOf = (ds, ps) => ds.flatMap((d) => ps.map((part) => ({ d, part })))
  const candidates = [
    { key: 'all', label: '다 돼요', cells: cellsOf(days, parts) },
    { key: 'weekday-eve', label: '평일 저녁', cells: cellsOf(weekdays, eve) },
    { key: 'weekend', label: '주말', cells: cellsOf(weekend, parts) },
    { key: 'weekday-day', label: '평일 낮', cells: cellsOf(weekdays, day) },
    { key: 'weekdays', label: '평일만', cells: cellsOf(weekdays, parts) },
    { key: 'weekend-pm', label: '주말 오후', cells: cellsOf(weekend, named('오후')) },
    { key: 'eve', label: '저녁만', cells: cellsOf(days, eve) },
    { key: 'pm', label: '오후만', cells: cellsOf(days, named('오후')) },
    { key: 'am', label: '오전만', cells: cellsOf(days, named('오전')) },
  ]
  const seen = new Set()
  const list = candidates.filter((c) => {
    if (!c.cells.length) return false
    const sig = c.cells.map((x) => `${x.d}-${x.part.from}`).join(',')
    if (seen.has(sig)) return false
    seen.add(sig)
    return true
  })
  list.push({ key: 'clear', label: '비우기', cells: null })
  return list
}

/** 빠른 선택 적용: '비우기'는 전부 지우고, 나머지는 해당 칸을 돼요로 더해요 */
export function applyPreset(cfg, cells, preset) {
  if (!preset.cells) return {}
  return fill(cells, keysOfCells(cfg, preset.cells), 'y')
}

/** 아래 상태 줄: 'N칸 돼요 · 애매 N칸 · 나머지는 안 돼요' (큰 칸 기준 개수) */
export function paintSummary(cfg, parts, cells) {
  let y = 0
  let m = 0
  for (let d = 0; d < nDays(cfg); d++) {
    for (const part of parts) {
      const st = paintState(cells, keysOf(cfg, d, part))
      if (st === 'y') y++
      else if (st === 'm') m++
      else if (st === 'mix') y++ // 30분 단위로 일부만 칠한 칸도 칠한 칸으로 세요
    }
  }
  if (!y && !m) return { empty: true, text: '되는 시간을 칠해 주세요 · 아직 미입력' }
  return { empty: false, y, m, text: `${y}칸 돼요${m ? ` · 애매 ${m}칸` : ''} · 나머지는 안 돼요` }
}
