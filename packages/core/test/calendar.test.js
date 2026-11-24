import { describe, expect, it } from 'vitest'
import { applyBusy, fetchBusy, googleAuthUrl, isAppReturn, readGoogleReturn, splitByBusy, withNonce } from '../src/api/calendar.js'
import { slotRange } from '../src/schedule.js'

// 하루짜리 9~11시 (30분 칸 4개)
const cfg = { start: '2026-12-01', days: 1, from: 9, to: 11, startHour: null, endHour: null, dur: 2 }

describe('Google 캘린더 free/busy', () => {
  it('바쁜 구간과 겹치는 칸만 바빠요', () => {
    const [a] = slotRange(cfg, 0, 1) // 9:30
    const [, b] = slotRange(cfg, 0, 1) // ~10:00
    expect(splitByBusy(cfg, [[a + 60000, b - 60000]])).toEqual({ busyKeys: ['0-1'], freeKeys: ['0-0', '0-2', '0-3'] })
  })
  it('반영: 바쁜 칸은 지우고(빈칸 = 안 돼요), 빈 시간 채우기는 비어 있는 칸만', () => {
    const r = applyBusy({ '0-0': 'm', '0-1': 'y' }, { busyKeys: ['0-1'], freeKeys: ['0-0', '0-2'] }, { markBusy: true, fillFree: true })
    expect(r).toEqual({ next: { '0-0': 'm', '0-2': 'y' }, changed: 2 })
    // 아무것도 안 칠한 사람이 바쁜 시간만 빼면 그대로 미입력 (전부 안 돼요가 되지 않게)
    expect(applyBusy({}, { busyKeys: ['0-1'], freeKeys: [] }).next).toEqual({})
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
  it('돌아갈 주소: 바깥 exp:// 호스트는 막고, nonce가 다르면 받지 않아요', () => {
    expect(isAppReturn('exp://evil.example.com:8081/--/gcal')).toBe(false)
    expect(isAppReturn('exp://192.168.0.5:8081/--/gcal')).toBe(true)
    const n = 'a1b2c3d4e5f6a7b8c9d0'
    expect(isAppReturn(withNonce('overlap://gcal', n))).toBe(true)
    expect(isAppReturn('overlap://gcal?n=short')).toBe(false)
    expect(readGoogleReturn(`overlap://gcal?n=${n}#access_token=t1`, n)).toEqual({ token: 't1' })
    expect(readGoogleReturn('overlap://gcal?n=zzzzzzzzzzzzzzzzzzzz#access_token=t1', n).error).toBeTruthy()
  })
})
