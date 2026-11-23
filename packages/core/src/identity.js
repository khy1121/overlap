// 이름 + 생년월일 로그인: 내부 로그인 식별자(가짜 이메일)와 생년월일 입력 처리.
// loginEmail 규칙은 supabase/functions/signup/index.ts 의 loginEmail 과 반드시 같아야 해요.
// SHA-256은 플랫폼마다 달라서 함수로 받아요: 웹은 crypto.subtle, 앱은 expo-crypto.

export function normalizeName(name) {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ')
}

/** sha256Hex(text) → 64자리 16진수 문자열을 돌려주는 함수 */
export async function loginEmail(name, birth, sha256Hex) {
  const hex = await sha256Hex(`${normalizeName(name).toLowerCase()}|${birth}`)
  return `u${hex.slice(0, 32)}@users.overlap.example.com`
}

/** 생년월일 입력값(8자리 19990315 또는 6자리 990315) → 'YYYY-MM-DD' (잘못된 날짜면 null) */
export function parseBirth(value, now = new Date()) {
  let d = value.replace(/\D/g, '')
  if (d.length === 6) {
    const yy = Number(d.slice(0, 2))
    d = `${yy > now.getFullYear() % 100 ? 19 : 20}${d}`
  }
  if (d.length !== 8) return null
  const [y, m, day] = [Number(d.slice(0, 4)), Number(d.slice(4, 6)), Number(d.slice(6, 8))]
  const date = new Date(y, m - 1, day)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== day) return null
  if (y < 1900 || date > now) return null
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

/** 'YYYY-MM-DD' → 만 나이 */
export function ageOf(iso, now = new Date()) {
  const [y, m, d] = iso.split('-').map(Number)
  return now.getFullYear() - y - (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d) ? 1 : 0)
}

/** 입력하는 동안 1999.03.15처럼 점 찍기 */
export const dotted = (digits) => [digits.slice(0, 4), digits.slice(4, 6), digits.slice(6, 8)].filter(Boolean).join('.')
