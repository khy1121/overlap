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
  return m.full_name || m.name || m.nickname || m.preferred_username || m.user_name || ''
}

// 카카오 로그인 후 돌아올 주소: 초대 링크(?m=…)로 들어왔으면 그 약속으로 다시
function backHere() {
  const mid = new URLSearchParams(window.location.search).get('m')
  return `${window.location.origin}/${mid ? `?m=${encodeURIComponent(mid)}` : ''}`
}

/** 카카오로 시작하기 (처음이면 카카오 닉네임·프로필 사진으로 자동 가입) */
export async function signInWithKakao() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo: backHere() } })
  if (error) throw new Error(`카카오 로그인을 시작하지 못했어요: ${error.message}`)
}

/** 지금 계정(이름+생년월일)에 카카오 연결: 비밀번호를 잊어도 카카오로 로그인할 수 있게 */
export async function linkKakao() {
  const { error } = await supabase.auth.linkIdentity({ provider: 'kakao', options: { redirectTo: `${window.location.origin}/?linked=kakao` } })
  if (error) {
    if (/manual linking/i.test(error.message)) throw new Error('카카오 연결 설정이 아직 꺼져 있어요. Supabase에서 수동 계정 연결(manual linking)을 켜 주세요.')
    throw new Error(`카카오 연결을 시작하지 못했어요: ${error.message}`)
  }
}

export const hasKakao = (user) => Boolean(user?.identities?.some((i) => i.provider === 'kakao'))
