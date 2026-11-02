import { supabase } from './supabase'
import { loginEmail, normalizeName } from './identity'

export async function signIn({ name, birth, password }) {
  const email = await loginEmail(name, birth)
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    if (/invalid login/i.test(error.message)) throw new Error('이름, 생년월일, 비밀번호를 다시 확인해 주세요.')
    throw new Error(`로그인하지 못했어요: ${error.message}`)
  }
}

export async function signUp({ name, birth, password }) {
  const { error } = await supabase.functions.invoke('signup', {
    body: { name: normalizeName(name), birth, password },
  })
  if (error) {
    let message = '가입하지 못했어요. 잠시 후 다시 시도해 주세요.'
    try {
      const body = await error.context.json()
      if (body?.message) message = body.message
    } catch {
      /* 응답 본문이 없으면 기본 문구 */
    }
    throw new Error(message)
  }
  await signIn({ name, birth, password })
}

export function displayName(user) {
  const m = user?.user_metadata || {}
  return m.full_name || m.name || ''
}
