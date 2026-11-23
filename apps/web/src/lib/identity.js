// 이름 + 생년월일 로그인 식별자: 규칙은 @overlap/core/identity, 여기서는 브라우저의 SHA-256을 넣어 줘요
import { loginEmail as coreLoginEmail } from '@overlap/core/identity'

export { normalizeName } from '@overlap/core/identity'

export async function sha256Hex(text) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const loginEmail = (name, birth) => coreLoginEmail(name, birth, sha256Hex)
