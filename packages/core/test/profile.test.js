import { describe, expect, it } from 'vitest'
import { deleteAccount, fetchFriends, formatCode, updateMyName } from '../src/api/profile.js'
import { meetingLink } from '../src/site.js'

const db = (rpcs = {}, extra = {}) => ({
  rpc: async (name) => (typeof rpcs[name] === 'function' ? rpcs[name]() : rpcs[name]),
  auth: { updateUser: async () => ({}), signOut: async () => ({}) },
  ...extra,
})

describe('프로필·친구·계정', () => {
  it('친구 코드 표시와 약속 링크', () => {
    expect(formatCode('K7PQ3M9X')).toBe('K7PQ-3M9X')
    expect(formatCode(null)).toBe('')
    expect(meetingLink('m1')).toBe('https://overlap-liard.vercel.app/?m=m1')
  })
  it('이름은 1~20자', async () => {
    await expect(updateMyName(db(), '   ')).rejects.toThrow('1~20자')
    await expect(updateMyName(db(), 'a'.repeat(21))).rejects.toThrow('1~20자')
    expect(await updateMyName(db({ update_my_name: { data: '민지', error: null } }), ' 민지 ')).toBe('민지')
  })
  it('친구 목록: 최근 함수가 없으면 이름순 전체에서 잘라요', async () => {
    const d = db({
      my_friends_recent: { data: null, error: { message: 'missing' } },
      my_friends: { data: [{ user_id: 'a' }, { user_id: 'b' }, { user_id: 'c' }], error: null },
    })
    expect(await fetchFriends(d, 1, 1)).toEqual({ rows: [{ user_id: 'b' }], total: 3, recent: false })
  })
  it('탈퇴 실패 문구: 서버 함수가 없으면(404) 안내', async () => {
    const d = db({}, { functions: { invoke: async () => ({ error: { context: { status: 404, json: async () => ({}) } } }) } })
    await expect(deleteAccount(d, '탈퇴')).rejects.toThrow('아직 서버에 준비되지')
  })
})
