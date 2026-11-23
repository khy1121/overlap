// 이름·생년월일·비밀번호 로그인과 가입. Supabase 클라이언트(db)와 SHA-256 함수를 받아요.
// (카카오 로그인처럼 브라우저·앱마다 다른 흐름은 각자 둬요)
import { loginEmail, normalizeName } from '../identity.js'

export async function signIn(db, { name, birth, password }, sha256Hex) {
  const email = await loginEmail(name, birth, sha256Hex)
  const { error } = await db.auth.signInWithPassword({ email, password })
  if (error) {
    if (/invalid login/i.test(error.message)) throw new Error('이름, 생년월일, 비밀번호를 다시 확인해 주세요.')
    throw new Error(`로그인하지 못했어요: ${error.message}`)
  }
}

/** 가입: signup Edge Function이 계정을 만들고, 바로 로그인해요 */
export async function signUp(db, { name, birth, password }, sha256Hex) {
  const { error } = await db.functions.invoke('signup', { body: { name: normalizeName(name), birth, password } })
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
  await signIn(db, { name, birth, password }, sha256Hex)
}

/** 화면에 보일 이름 (카카오·이름 가입 모두) */
export function displayName(user) {
  const m = user?.user_metadata || {}
  return m.full_name || m.name || m.nickname || m.preferred_username || m.user_name || ''
}

/**
 * 앱 소셜 로그인(카카오) 돌아온 주소 읽기: overlap://auth-callback?code=… → { code }
 * 취소·실패면 { error } (카카오·Supabase가 보낸 설명을 그대로 쓰지 않고 짧은 문구로)
 */
export function readAuthCallback(url) {
  const q = String(url || '').split(/[?#]/).slice(1).join('&')
  const p = Object.fromEntries(q.split('&').filter(Boolean).map((kv) => { const [k, v = ''] = kv.split('='); return [k, decodeURIComponent(v.replace(/\+/g, ' '))] }))
  if (p.code) return { code: p.code }
  if (p.error === 'access_denied') return { error: '카카오 로그인을 취소했어요.' }
  return { error: '카카오 로그인을 마치지 못했어요. 다시 시도해 주세요.' }
}
