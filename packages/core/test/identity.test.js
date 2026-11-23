import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { ageOf, dotted, loginEmail, normalizeName, parseBirth } from '../src/identity.js'

const sha256Hex = async (text) => createHash('sha256').update(text, 'utf8').digest('hex')

describe('이름·생년월일 로그인 식별자', () => {
  // supabase/functions/signup/index.ts 의 loginEmail 과 같은 규칙: u + sha256(소문자 이름|생년월일) 앞 32자리
  it('서버 가입 함수와 같은 식별자를 만들어요 (바뀌면 기존 계정이 로그인 못 해요)', async () => {
    expect(await loginEmail('홍 길동', '1999-03-15', sha256Hex)).toBe('ub2b104d061a1bd2f28e050c62d02bb41@users.overlap.example.com')
  })
  it('앞뒤·중복 공백과 대소문자는 같은 사람으로 봐요', async () => {
    expect(normalizeName('  홍   길동 ')).toBe('홍 길동')
    expect(await loginEmail('  홍   길동 ', '1999-03-15', sha256Hex)).toBe(await loginEmail('홍 길동', '1999-03-15', sha256Hex))
    expect(await loginEmail('Kim', '2000-01-01', sha256Hex)).toBe(await loginEmail('kim', '2000-01-01', sha256Hex))
  })
})

describe('생년월일 입력', () => {
  const now = new Date(2026, 10, 23)
  it('8자리·6자리 모두 받아요', () => {
    expect(parseBirth('19990315', now)).toBe('1999-03-15')
    expect(parseBirth('990315', now)).toBe('1999-03-15')
    expect(parseBirth('050101', now)).toBe('2005-01-01')
    expect(parseBirth('1999.03.15', now)).toBe('1999-03-15')
  })
  it('없는 날짜·미래·너무 옛날은 null', () => {
    expect(parseBirth('19990231', now)).toBeNull()
    expect(parseBirth('20301201', now)).toBeNull()
    expect(parseBirth('18991231', now)).toBeNull()
    expect(parseBirth('1234', now)).toBeNull()
  })
  it('만 나이와 점 찍기', () => {
    expect(ageOf('2012-11-24', now)).toBe(13)
    expect(ageOf('2012-11-23', now)).toBe(14)
    expect(dotted('19990315')).toBe('1999.03.15')
  })
})
