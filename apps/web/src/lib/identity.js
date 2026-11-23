// 이름 + 생년월일로 내부 로그인 식별자를 만든다.
// supabase/functions/signup/index.ts 의 loginEmail 과 반드시 같은 규칙이어야 한다.
export function normalizeName(name) {
  return name.normalize('NFC').trim().replace(/\s+/g, ' ')
}

export async function loginEmail(name, birth) {
  const data = new TextEncoder().encode(`${normalizeName(name).toLowerCase()}|${birth}`)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
  return `u${hex.slice(0, 32)}@users.overlap.example.com`
}
