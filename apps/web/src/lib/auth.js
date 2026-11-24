import { supabase } from './supabase'
import * as core from '@overlap/core/api/auth'
import { sha256Hex } from './identity'

// 이름·생년월일 로그인·가입은 @overlap/core (웹 클라이언트와 SHA-256을 넣어 줘요)
export const signIn = (form) => core.signIn(supabase, form, sha256Hex)
export const signUp = (form) => core.signUp(supabase, form, sha256Hex)
export { displayName } from '@overlap/core/api/auth'

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

// ── 새 가입 방식: Google · 이메일 (규칙·문구는 @overlap/core, 앱과 같아요) ──
export { age14Ok, checkEmailSignup, isLegacyAccount } from '@overlap/core/api/auth'

/** Google로 시작하기 (처음이면 자동 가입). 돌아올 주소는 카카오와 같아요 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: backHere() } })
  if (error) throw new Error(core.authMessage(error))
}
export const signInEmail = (form) => core.signInEmail(supabase, form)
/** 인증 메일의 링크는 이 사이트로 돌아와요 (초대 링크로 들어왔으면 그 약속으로) */
export const signUpEmail = (form) => core.signUpEmail(supabase, form, backHere())
export const sendPasswordReset = (email) => core.sendPasswordReset(supabase, email, `${window.location.origin}/?reset=1`)
export const updatePassword = (password) => core.updatePassword(supabase, password)
export const confirmAge14 = () => core.confirmAge14(supabase)
