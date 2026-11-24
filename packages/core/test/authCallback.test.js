import { describe, expect, it } from 'vitest'
import { readAuthCallback } from '../src/api/auth.js'

describe('앱 카카오 로그인 돌아온 주소', () => {
  it('코드', () => expect(readAuthCallback('overlap://auth-callback?code=abc-123')).toEqual({ code: 'abc-123' }))
  it('Expo Go 주소도', () => expect(readAuthCallback('exp://127.0.0.1:8090/--/auth-callback?code=x')).toEqual({ code: 'x' }))
  it('취소·실패', () => {
    expect(readAuthCallback('overlap://auth-callback?error=access_denied&error_description=User+denied')).toEqual({ error: '로그인을 취소했어요.' })
    expect(readAuthCallback('overlap://auth-callback#error=server_error').error).toMatch('마치지 못했어요')
  })
})
