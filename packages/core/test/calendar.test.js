import { describe, expect, it } from 'vitest'
import { applyBusy, fetchBusy, googleAuthUrl, isAppReturn, readGoogleReturn, splitByBusy } from '../src/api/calendar.js'
import { slotRange } from '../src/schedule.js'

// 하루짜리 9~11시 (30분 칸 4개)
const cfg = { start: '2026-12-01', days: 1, from: 9, to: 11, startHour: null, endHour: null, dur: 2 }

describe('Google 캘린더 free/busy', () => {
  it('바쁜 구간과 겹치는 칸만 바빠요', () => {
    const [a] = slotRange(cfg, 0, 1) // 9:30
    const [, b] = slotRange(cfg, 0, 1) // ~10:00
    expect(splitByBusy(cfg, [[a + 60000, b - 60000]])).toEqual({ busyKeys: ['0-1'], freeKeys: ['0-0', '0-2', '0-3'] })
  })
  it('반영: 바쁜 칸 → 안 돼요, 빈 칸 채우기는 미입력만', () => {
    const r = applyBusy({ '0-0': 'm' }, { busyKeys: ['0-1'], freeKeys: ['0-0', '0-2'] }, { markBusy: true, fillFree: true })
    expect(r).toEqual({ next: { '0-0': 'm', '0-1': 'n', '0-2': 'y' }, changed: 2 })
  })
  it('권한 만료는 code expired', async () => {
    await expect(fetchBusy('t', cfg, async () => ({ status: 401 }))).rejects.toMatchObject({ code: 'expired' })
    const ok = async () => ({ status: 200, ok: true, json: async () => ({ calendars: { primary: { busy: [] } } }) })
    expect((await fetchBusy('t', cfg, ok)).freeKeys).toHaveLength(4)
  })
  it('앱 연결: 돌아갈 주소는 앱 스킴·Expo Go만, 토큰 읽기', () => {
    expect(isAppReturn('overlap://gcal')).toBe(true)
    expect(isAppReturn('exp://127.0.0.1:8090/--/gcal')).toBe(true)
    expect(isAppReturn('https://evil.example/gcal')).toBe(false)
    expect(isAppReturn('overlap://gcal/../x')).toBe(false)
    const u = new URL(googleAuthUrl({ clientId: 'cid', origin: 'https://o.app', returnUrl: 'overlap://gcal' }))
    expect(u.searchParams.get('redirect_uri')).toBe('https://o.app/gcal-callback.html')
    expect(u.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/calendar.freebusy')
    expect(u.searchParams.get('state')).toBe('overlap://gcal')
    expect(readGoogleReturn('overlap://gcal#access_token=abc&token_type=Bearer')).toEqual({ token: 'abc' })
    expect(readGoogleReturn('overlap://gcal#error=access_denied').error).toMatch('취소')
  })
})
