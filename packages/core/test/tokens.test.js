import { describe, expect, it } from 'vitest'
import { brand, colors, cssVars, radius, themeColor } from '../src/tokens.js'

describe('디자인 토큰', () => {
  it('라이트와 다크의 색 이름이 같아요 (한쪽에만 있는 색이 없게)', () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort())
  })
  it('모든 색은 #rrggbb', () => {
    for (const v of [...Object.values(colors.light), ...Object.values(colors.dark), ...Object.values(brand)]) expect(v).toMatch(/^#[0-9a-fA-F]{6}$/)
  })
  it('CSS 변수 묶음', () => {
    const v = cssVars('dark')
    expect(v['--paper']).toBe('#17171c')
    expect(v['--shadow-soft']).toContain('rgba')
    expect(v['color-scheme']).toBe('dark')
    expect(themeColor).toEqual({ light: '#f2f4f6', dark: '#17171c' })
    expect(radius.DEFAULT).toBe(10)
  })
})
