import { describe, expect, it } from 'vitest'
import { appPathOf, saveAppToken } from '../src/api/notify.js'

describe('알림', () => {
  it('알림 주소 → 앱 경로', () => {
    expect(appPathOf('/?m=2f1c9a7e-0000-4000-8000-000000000001')).toBe('m/2f1c9a7e-0000-4000-8000-000000000001')
    expect(appPathOf('/?page=friends')).toBe('friends')
    expect(appPathOf('/?page=settings')).toBe('settings')
    expect(appPathOf('/?m=../../x')).toBe('')
    expect(appPathOf('/')).toBe('')
    expect(appPathOf(undefined)).toBe('')
  })
  it('앱 토큰: 서버 함수가 아직 없으면 조용히 넘어가요', async () => {
    await expect(saveAppToken({ rpc: async () => ({ error: { message: 'Could not find the function' } }) }, 'ExponentPushToken[x]', 'android')).resolves.toBeUndefined()
    await expect(saveAppToken({ rpc: async () => ({ error: { message: 'bad token' } }) }, 'x', 'android')).rejects.toThrow('등록하지 못했어요')
  })
})
