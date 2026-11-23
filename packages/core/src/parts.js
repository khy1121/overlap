// 큰 칸 입력: 약속 시간 범위를 시간대로 나누고, 시간대에 속한 30분 칸 키를 구해요
import { blocked, rowFrom, rowTo } from './schedule.js'

/** 기본 나누는 시각: 오전(~12시) · 오후(12~18시) · 저녁(18시~) */
export const DEFAULT_BOUNDS = [12, 18]
const period = (h) => (h < 6 ? '새벽' : h < 12 ? '오전' : h < 18 ? '오후' : h < 22 ? '저녁' : '밤')

/**
 * 약속 시간 범위를 큰 시간대로 나눠요.
 * bounds = 나누는 시각들 (사용자가 바꿀 수 있어요, 기본 12·18시). 범위 밖 시각은 무시해요.
 * 그렇게 나눈 칸이 2개 미만이면(예: 18~23시 약속) 1~2시간 단위로 3칸쯤.
 * 결과: [{ from, to, label, sub }] (시각은 정수 시)
 */
export function partsOf(cfg, bounds = DEFAULT_BOUNDS) {
  const a = rowFrom(cfg)
  const b = rowTo(cfg)
  const cuts = [...new Set(bounds)].filter((h) => h > a && h < b).sort((x, y) => x - y)
  const edges = [a, ...cuts, b]
  const segs = edges.slice(0, -1).map((from, i) => ({ from, to: edges[i + 1] })).filter((p) => p.to - p.from >= 1)
  const isDefault = bounds.length === DEFAULT_BOUNDS.length && bounds.every((h, i) => h === DEFAULT_BOUNDS[i])
  if (segs.length >= 2) {
    return segs.map((p) => (isDefault
      ? { ...p, label: period(p.from), sub: `${p.from}–${p.to}시` }
      : { ...p, label: `${p.from}–${p.to}시`, sub: period(p.from) }))
  }
  // 한 시간대 안에 들어가는 좁은 범위: 비슷한 길이로 3칸 (1시간 미만 칸은 만들지 않아요)
  const len = b - a
  const n = Math.min(3, Math.max(1, len))
  const step = Math.ceil(len / n)
  const out = []
  for (let h = a; h < b; h += step) out.push({ from: h, to: Math.min(b, h + step), label: `${h}–${Math.min(b, h + step)}시`, sub: '' })
  return out
}

/** 그 요일·시간대에 속한 30분 칸 키 (약속 범위 밖 칸은 빼요) */
export function keysOf(cfg, d, part) {
  const keys = []
  const base = rowFrom(cfg)
  for (let s = (part.from - base) * 2; s < (part.to - base) * 2; s++) if (!blocked(cfg, d, s)) keys.push(`${d}-${s}`)
  return keys
}
