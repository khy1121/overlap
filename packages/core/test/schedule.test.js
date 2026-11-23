import { describe, expect, it } from 'vitest'
import { blocked, briefRange, dayLabel, durText, evaluate, nSlots, rangeError, rowFrom, summary, timeText } from '../src/schedule.js'

// 2026-11-23은 월요일
const cfg = (o = {}) => ({ start: '2026-11-23', days: 3, from: 18, to: 22, dur: 2, count: 3, ...o })
// 사람 한 명: cells 키는 '요일칸-30분칸'
const person = (id, cells, role) => ({ id, cells, ...(role ? { role } : {}) })
const fill = (d, from, to, v = 'y') => Object.fromEntries(Array.from({ length: to - from }, (_, i) => [`${d}-${from + i}`, v]))

describe('시간 칸 계산', () => {
  it('하루 시간대를 30분 칸으로 나눠요', () => {
    expect(nSlots(cfg())).toBe(8) // 18~22시
    expect(rowFrom(cfg({ startHour: 12 }))).toBe(12) // 첫날을 12시부터 정하면 시간표는 12시부터
  })
  it('첫날 시작 전·마지막 날 끝 뒤 칸은 막혀요', () => {
    const c = cfg({ startHour: 20, endHour: 21 })
    expect(blocked(c, 0, 0)).toBe(true) // 첫날 18시 (20시 전)
    expect(blocked(c, 0, 4)).toBe(false) // 첫날 20시
    expect(blocked(c, 2, 6)).toBe(true) // 마지막 날 21시 (21시까지)
    expect(blocked(c, 1, 0)).toBe(false) // 가운데 날은 하루 시간대 그대로
  })
  it('날짜·시각 표시', () => {
    expect(dayLabel(cfg(), 0)).toBe('11/23 (월)')
    expect(timeText(cfg(), 2)).toBe('19:00–20:00')
    expect(durText(3)).toBe('1시간 30분')
    expect(durText(null)).toBe('시간 미정')
  })
  it('기간 한 줄 표시: 따로 정한 첫날·마지막 날 시각만 덧붙여요', () => {
    expect(briefRange(cfg())).toBe('11/23(월)–11/25(수) · 매일 18–22시')
    expect(briefRange(cfg({ days: 1 }))).toBe('11/23(월) · 18–22시')
    expect(briefRange(cfg({ startHour: 20 }))).toBe('11/23(월)–11/25(수) · 매일 18–22시 · 첫날 20시부터')
  })
  it('잘못된 범위는 알려 줘요', () => {
    expect(rangeError(cfg({ days: 15 }))).toBeTruthy()
    expect(rangeError(cfg())).toBeFalsy()
  })
})

describe('추천 계산 (evaluate)', () => {
  it('아무도 입력하지 않으면 추천이 없어요', () => {
    const r = evaluate(cfg(), [person('a', {}), person('b', {})])
    expect(r.entered).toBe(0)
    expect(r.rec).toEqual([])
  })
  it('모두 가능한 시간이 all에 들어가고 추천 1순위예요', () => {
    const r = evaluate(cfg(), [person('a', fill(1, 2, 6)), person('b', fill(1, 2, 6)), person('c', fill(1, 0, 8))])
    expect(r.all.length).toBeGreaterThan(0)
    expect(r.all[0]).toMatchObject({ d: 1, s: 2 })
    expect(r.rec[0].d).toBe(1)
    expect(summary(r.all[0], r.n)).toBe('3명 모두 가능')
  })
  it('불가가 있으면 모두 가능이 아니고, 점수에서 크게 빠져요', () => {
    const r = evaluate(cfg(), [person('a', fill(0, 0, 4)), person('b', fill(0, 0, 4)), person('c', fill(0, 0, 4, 'n'))])
    expect(r.all).toEqual([])
    expect(r.rec[0].g.n).toEqual(['c'])
  })
  it('예상 인원보다 적게 들어왔으면 모두 가능이 아니에요 (미입력이 남아요)', () => {
    const r = evaluate(cfg({ count: 4 }), [person('a', fill(0, 0, 4)), person('b', fill(0, 0, 4)), person('c', fill(0, 0, 4))])
    expect(r.all).toEqual([])
    expect(r.rec[0].missing).toBe(1)
  })
  it('선택 참석자가 안 돼도 꼭 오는 사람이 모두 되면 모두 가능이에요', () => {
    const r = evaluate(cfg(), [person('a', fill(0, 0, 4)), person('b', fill(0, 0, 4)), person('c', fill(0, 0, 4, 'n'), 'optional')])
    expect(r.all.length).toBeGreaterThan(0)
    expect(summary(r.all[0], r.n)).toContain('꼭 와야 하는 사람 모두 가능')
  })
  it('같은 날 겹치는 후보는 하나만 추천해요', () => {
    const r = evaluate(cfg(), [person('a', fill(0, 0, 8)), person('b', fill(0, 0, 8)), person('c', fill(0, 0, 8))])
    const day0 = r.rec.filter((w) => w.d === 0)
    expect(day0.length).toBe(1)
    expect(day0[0].span).toEqual({ s: 0, e: 8 }) // 18~22시 내내 가능 → 구간 전체
  })
})
