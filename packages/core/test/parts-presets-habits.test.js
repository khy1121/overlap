import { describe, expect, it } from 'vitest'
import { DEFAULT_BOUNDS, keysOf, partsOf } from '../src/parts.js'
import { addDays, daysBetween } from '../src/presets.js'
import { habitCells } from '../src/habits.js'

const cfg = (from, to, o = {}) => ({ start: '2026-11-23', days: 5, from, to, dur: 2, count: 2, ...o })
const show = (c, b) => partsOf(c, b).map((p) => p.label)

describe('큰 칸 시간대 나누기 (partsOf)', () => {
  it('기본은 오전·오후·저녁', () => {
    expect(show(cfg(9, 22))).toEqual(['오전', '오후', '저녁'])
    expect(partsOf(cfg(9, 22))[1]).toMatchObject({ from: 12, to: 18, sub: '12–18시' })
  })
  it('좁은 범위는 1~2시간 단위 3칸', () => {
    expect(show(cfg(18, 23))).toEqual(['18–20시', '20–22시', '22–23시'])
  })
  it('사용자 맞춤 구분: 시각을 크게, 시간대 이름은 아래에', () => {
    expect(show(cfg(9, 22), [19])).toEqual(['9–19시', '19–22시'])
    expect(partsOf(cfg(9, 22), [19])[1].sub).toBe('저녁')
    expect(show(cfg(9, 22), [11, 14, 19])).toEqual(['9–11시', '11–14시', '14–19시', '19–22시'])
  })
  it('범위 밖 구분 시각은 무시해요', () => {
    expect(show(cfg(9, 18), [6, 12, 23])).toEqual(['9–12시', '12–18시'])
    expect(DEFAULT_BOUNDS).toEqual([12, 18])
  })
  it('시간대의 30분 칸 키 (막힌 칸 제외)', () => {
    const c = cfg(18, 22, { startHour: 20 })
    const [first] = partsOf(c) // 18–20시 (좁은 범위라 시각 단위)
    expect(keysOf(c, 0, first)).toEqual([]) // 첫날은 20시부터라 전부 막힘
    expect(keysOf(c, 1, first)).toEqual(['1-0', '1-1', '1-2', '1-3'])
  })
})

describe('빠른 선택 날짜 계산', () => {
  it('날짜 더하기와 기간 일수', () => {
    expect(addDays('2026-11-30', 2)).toBe('2026-12-02')
    expect(daysBetween('2026-11-23', '2026-11-29')).toBe(7)
  })
})

describe('자주 되던 시간 (habitCells)', () => {
  // 월요일(1) 19:00(칸 38)·19:30(39)은 3번 중 2번 가능, 20:00(40)은 3번 중 1번
  const seen = Array.from({ length: 7 }, () => new Array(48).fill(0))
  const yes = Array.from({ length: 7 }, () => new Array(48).fill(0))
  ;[38, 39, 40].forEach((h) => { seen[1][h] = 3 })
  yes[1][38] = 2
  yes[1][39] = 2
  yes[1][40] = 1
  it('2번 이상 나왔고 절반 이상 가능이었던 칸만 채워요', () => {
    const c = cfg(18, 22) // 11/23 = 월요일, 칸 0 = 18:00 → 19:00은 칸 2
    const { cells, filled } = habitCells(c, { meetings: 3, seen, yes })
    expect(filled).toBe(2)
    expect(cells).toEqual({ '0-2': 'y', '0-3': 'y' })
  })
  it('기록이 없으면 아무것도 안 채워요', () => {
    expect(habitCells(cfg(18, 22), { meetings: 0 })).toEqual({ cells: {}, filled: 0 })
  })
})
