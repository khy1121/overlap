import { describe, expect, it } from 'vitest'
import { applyPreset, fill, longValue, paintState, paintSummary, presets, tapValue } from '../src/paint.js'
import { keysOf, partsOf } from '../src/parts.js'

// 2026-11-30(월) ~ 12/6(일), 매일 9~22시 → 오전·오후·저녁
const cfg = { start: '2026-11-30', days: 7, from: 9, to: 22, startHour: null, endHour: null, dur: 2 }
const parts = partsOf(cfg)

describe('큰 칸 칠하기', () => {
  it('상태: 예전 안 돼요(n)는 빈칸, 섞이면 mix', () => {
    const k = keysOf(cfg, 0, parts[0])
    expect(paintState({}, k)).toBe('')
    expect(paintState(fill({}, k, 'y'), k)).toBe('y')
    expect(paintState(fill({}, k, 'n'), k)).toBe('')
    expect(paintState({ [k[0]]: 'y' }, k)).toBe('mix')
    expect(paintState({}, [])).toBe('x')
  })
  it('누르기·길게 누르기: 돼요 ↔ 빈칸, 애매 ↔ 빈칸', () => {
    const k = keysOf(cfg, 0, parts[2])
    expect(tapValue({}, k)).toBe('y')
    expect(tapValue(fill({}, k, 'y'), k)).toBeNull()
    expect(tapValue({ [k[0]]: 'y' }, k)).toBe('y') // 일부만이면 전부 칠하기
    expect(longValue({}, k)).toBe('m')
    expect(longValue(fill({}, k, 'm'), k)).toBeNull()
    expect(fill(fill({}, k, 'y'), k, null)).toEqual({})
  })
  it('빠른 선택: 평일 저녁·주말·다 돼요·비우기', () => {
    const list = presets(cfg, parts)
    expect(list.map((p) => p.label)).toEqual(['다 돼요', '평일 저녁', '주말', '평일 낮', '평일만', '주말 오후', '저녁만', '오후만', '오전만', '비우기'])
    const eve = applyPreset(cfg, {}, list[1])
    expect(paintState(eve, keysOf(cfg, 0, parts[2]))).toBe('y') // 월 저녁
    expect(paintState(eve, keysOf(cfg, 5, parts[2]))).toBe('') // 토 저녁은 아님
    const wk = applyPreset(cfg, {}, list[2])
    expect(paintState(wk, keysOf(cfg, 6, parts[0]))).toBe('y') // 일 오전
    expect(applyPreset(cfg, eve, list.at(-1))).toEqual({})
  })
  it('상태 줄', () => {
    expect(paintSummary(cfg, parts, {}).empty).toBe(true)
    const c = fill(fill({}, keysOf(cfg, 0, parts[2]), 'y'), keysOf(cfg, 1, parts[1]), 'm')
    expect(paintSummary(cfg, parts, c).text).toBe('1칸 돼요 · 애매 1칸 · 나머지는 안 돼요')
  })
  it('빠른 선택: 기간에 맞는 것만, 같은 칸이면 하나만', () => {
    // 평일 하루(화)만, 저녁 시간대만 있는 약속: 저녁 범위라 시간대가 1~2시간 단위로 나뉘어요
    const tue = { start: '2026-12-01', days: 1, from: 18, to: 23, startHour: null, endHour: null, dur: 2 }
    const labels = presets(tue, partsOf(tue)).map((p) => p.label)
    expect(labels[0]).toBe('다 돼요')
    expect(labels).not.toContain('주말')
    expect(labels).not.toContain('평일만') // '다 돼요'와 같은 칸
    expect(labels.at(-1)).toBe('비우기')
  })
})
