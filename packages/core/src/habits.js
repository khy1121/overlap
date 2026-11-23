// 자주 되던 시간: 지난 약속 응답을 모은 표(요일 × 하루 48칸)로 지금 약속에 채울 칸을 계산해요
import { blocked, dayOf, nDays, nSlots, rowFrom } from './schedule.js'

/**
 * 지금 약속에 '자주 되던 시간'을 채운 칸. 같은 요일·시각이 2번 이상 있었고 그중 절반 이상 가능이었던 칸만.
 * 결과: { cells, filled } (채울 게 없으면 filled 0)
 */
export function habitCells(cfg, habits) {
  const cells = {}
  if (!habits?.seen) return { cells, filled: 0 }
  const base = rowFrom(cfg) * 2
  let filled = 0
  for (let d = 0; d < nDays(cfg); d++) {
    const wd = dayOf(cfg, d).getDay()
    for (let s = 0; s < nSlots(cfg); s++) {
      if (blocked(cfg, d, s)) continue
      const h = base + s
      const n = habits.seen[wd]?.[h] || 0
      if (n >= 2 && habits.yes[wd][h] * 2 >= n) {
        cells[`${d}-${s}`] = 'y'
        filled++
      }
    }
  }
  return { cells, filled }
}
