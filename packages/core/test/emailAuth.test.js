import { describe, expect, it } from 'vitest'
import { age14Ok, authMessage, checkEmailSignup, isLegacyAccount, signUpEmail } from '../src/api/auth.js'

describe('새 가입 방식', () => {
  it('예전 이름·생년월일 계정은 만 14세 확인 완료로 봐요', () => {
    const legacy = { email: 'uabc@users.overlap.example.com', user_metadata: {} }
    expect(isLegacyAccount(legacy)).toBe(true)
    expect(age14Ok(legacy)).toBe(true)
    expect(age14Ok({ email: 'a@b.com', user_metadata: {} })).toBe(false)
    expect(age14Ok({ email: 'a@b.com', user_metadata: { age14: true } })).toBe(true)
    expect(age14Ok(null)).toBe(false)
  })
  it('이메일 가입 검사', () => {
    expect(checkEmailSignup({ email: 'x', password: '12345678', age14: true })).toMatch('이메일')
    expect(checkEmailSignup({ email: 'a@b.co', password: '1234567', age14: true })).toMatch('8자')
    expect(checkEmailSignup({ email: 'a@b.co', password: '12345678', confirm: '1', age14: true })).toMatch('서로 달라요')
    expect(checkEmailSignup({ email: 'a@b.co', password: '12345678', age14: false })).toMatch('14세')
    expect(checkEmailSignup({ email: 'a@b.co', password: '12345678', confirm: '12345678', age14: true })).toBe('')
  })
  it('오류 문구', () => {
    expect(authMessage({ message: 'Invalid login credentials' })).toMatch('맞지 않아요')
    expect(authMessage({ message: 'Email not confirmed' })).toMatch('인증 링크')
    expect(authMessage({ message: 'Unsupported provider: provider is not enabled' })).toMatch('준비 중')
  })
  it('이미 가입된 이메일도 새 가입과 같은 결과 (가입 여부가 드러나지 않게)', async () => {
    const db = { auth: { signUp: async () => ({ data: { user: { identities: [] }, session: null }, error: null }) } }
    expect(await signUpEmail(db, { email: 'a@b.co', password: '12345678', age14: true }, 'https://x')).toEqual({ needsConfirm: true })
    const ok = { auth: { signUp: async () => ({ data: { user: { identities: [{}] }, session: null }, error: null }) } }
    expect(await signUpEmail(ok, { email: 'a@b.co', password: '12345678', age14: true }, 'https://x')).toEqual({ needsConfirm: true })
  })
})
