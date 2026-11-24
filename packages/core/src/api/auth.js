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
 * 앱 소셜 로그인(카카오·Google) 돌아온 주소 읽기: overlap://auth-callback?code=… → { code }
 * 취소·실패면 { error } (카카오·Supabase가 보낸 설명을 그대로 쓰지 않고 짧은 문구로)
 */
export function readAuthCallback(url) {
  const q = String(url || '').split(/[?#]/).slice(1).join('&')
  const p = Object.fromEntries(q.split('&').filter(Boolean).map((kv) => { const [k, v = ''] = kv.split('='); return [k, decodeURIComponent(v.replace(/\+/g, ' '))] }))
  if (p.code) return { code: p.code }
  if (p.error === 'access_denied') return { error: '로그인을 취소했어요.' }
  return { error: '로그인을 마치지 못했어요. 다시 시도해 주세요.' }
}

// ── 새 가입 방식 (2026-11): 카카오 · Google · 이메일+비밀번호 ─────────────────
// 이름·생년월일 계정은 로그인만 유지해요(새 가입은 받지 않아요).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
/** 이름·생년월일로 가입한 예전 계정인지 (가입 때 생년월일로 만 14세를 이미 확인했어요) */
export const isLegacyAccount = (user) => /@users\.overlap\.example\.com$/i.test(user?.email || '')

/** 만 14세 이상 확인을 했는지: 예전 계정은 가입 때 확인함, 새 계정은 user_metadata.age14 */
export const age14Ok = (user) => isLegacyAccount(user) || user?.user_metadata?.age14 === true

/** 처음 들어온 Google·카카오 계정의 '만 14세 이상' 확인을 기록해요 */
export async function confirmAge14(db) {
  const { error } = await db.auth.updateUser({ data: { age14: true, age14_at: new Date().toISOString() } })
  if (error) throw new Error('확인을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
}

/** 이메일 가입 입력 검사 (문구로 돌려줘요, 문제 없으면 '') */
export function checkEmailSignup({ email, password, confirm, age14 }) {
  if (!EMAIL_RE.test(String(email || '').trim())) return '이메일 주소를 확인해 주세요.'
  if (String(password || '').length < 8) return '비밀번호는 8자 이상이에요.'
  if (confirm !== undefined && password !== confirm) return '비밀번호가 서로 달라요.'
  if (!age14) return '만 14세 이상만 가입할 수 있어요.'
  return ''
}

const authMessage = (error) => {
  const m = String(error?.message || '')
  if (/invalid login credentials/i.test(m)) return '이메일 또는 비밀번호가 맞지 않아요.'
  if (/email not confirmed/i.test(m)) return '메일함에서 인증 링크를 먼저 눌러 주세요.'
  if (/already registered|already exists/i.test(m)) return '이미 가입한 이메일이에요. 로그인하거나 비밀번호 찾기를 해 주세요.'
  if (/signups not allowed|signup is disabled/i.test(m)) return '지금은 이메일 가입을 받지 않아요.'
  if (/rate limit|too many/i.test(m)) return '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.'
  if (/provider is not enabled|unsupported provider/i.test(m)) return '이 로그인 방법은 아직 준비 중이에요.'
  if (/password.*(weak|short|characters)/i.test(m)) return '비밀번호가 너무 쉬워요. 8자 이상으로 섞어서 만들어 주세요.'
  return '잠시 후 다시 시도해 주세요.'
}

/** 이메일 로그인 */
export async function signInEmail(db, { email, password }) {
  const { error } = await db.auth.signInWithPassword({ email: String(email).trim(), password })
  if (error) throw new Error(authMessage(error))
}

/** 이메일 가입: 인증 메일을 보내요. 결과 { needsConfirm } (인증이 꺼져 있으면 바로 로그인돼요) */
export async function signUpEmail(db, form, emailRedirectTo) {
  const bad = checkEmailSignup(form)
  if (bad) throw new Error(bad)
  const { data, error } = await db.auth.signUp({
    email: String(form.email).trim(),
    password: form.password,
    options: { emailRedirectTo, data: { age14: true, age14_at: new Date().toISOString() } },
  })
  if (error) throw new Error(authMessage(error))
  // 이미 가입된(인증 완료) 이메일이면 Supabase는 오류 없이 빈 identities를 돌려줘요
  if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('이미 가입한 이메일이에요. 로그인하거나 비밀번호 찾기를 해 주세요.')
  }
  return { needsConfirm: !data?.session }
}

/** 비밀번호 찾기: 재설정 링크 메일 (가입 여부는 알려 주지 않아요) */
export async function sendPasswordReset(db, email, redirectTo) {
  if (!EMAIL_RE.test(String(email || '').trim())) throw new Error('이메일 주소를 확인해 주세요.')
  const { error } = await db.auth.resetPasswordForEmail(String(email).trim(), { redirectTo })
  if (error && !/user not found/i.test(error.message)) throw new Error(authMessage(error))
}

/** 재설정 링크로 들어온 뒤 새 비밀번호 저장 */
export async function updatePassword(db, password) {
  if (String(password || '').length < 8) throw new Error('비밀번호는 8자 이상이에요.')
  const { error } = await db.auth.updateUser({ password })
  if (error) throw new Error(authMessage(error))
}

export { authMessage }
