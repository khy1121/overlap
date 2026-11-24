import { describe, expect, it } from 'vitest'
import { cellStatus, evaluate, hasInput, windowStatus } from '../src/schedule.js'

// 하루짜리 18~20시 (30분 칸 4개), 1시간 약속
const cfg = { start: '2026-12-01', days: 1, from: 18, to: 20, startHour: null, endHour: null, dur: 2, count: 3 }

describe('되는 시간만 칠하기: 칠한 사람의 빈칸 = 안 돼요', () => {
  it('칸 상태', () => {
    const painted = { cells: { '0-0': 'y' } }
    const none = { cells: {} }
    expect(hasInput(painted)).toBe(true)
    expect(cellStatus(painted, '0-0')).toBe('y')
    expect(cellStatus(painted, '0-3')).toBe('n')
    expect(cellStatus(none, '0-3')).toBe('u')
  })
  it('구간 상태: blankAs', () => {
    expect(windowStatus({ '0-0': 'y' }, 0, 0, 2)).toBe('u')
    expect(windowStatus({ '0-0': 'y' }, 0, 0, 2, 'n')).toBe('n')
    expect(windowStatus({ '0-0': 'y', '0-1': 'm' }, 0, 0, 2, 'n')).toBe('m')
  })
  it('추천: 일부만 칠한 사람은 빈 시간에 불가, 안 칠한 사람만 미입력', () => {
    const people = [
      { id: 'a', cells: { '0-0': 'y', '0-1': 'y' } }, // 18~19시만 돼요
      { id: 'b', cells: { '0-2': 'y', '0-3': 'y' } }, // 19~20시만 돼요
      { id: 'c', cells: {} }, // 아직 안 칠함
    ]
    const r = evaluate(cfg, people)
    const at18 = r.rec.find((w) => w.s === 0)
    expect(at18.g.y).toEqual(['a'])
    expect(at18.g.n).toEqual(['b'])
    expect(at18.g.u).toEqual(['c'])
  })
})
