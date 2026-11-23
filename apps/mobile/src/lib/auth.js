// 이름·생년월일 로그인·가입: 규칙은 @overlap/core (웹과 같은 식별자), SHA-256만 expo-crypto로
import * as Crypto from 'expo-crypto'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import * as core from '@overlap/core/api/auth'
import { supabase } from './supabase'

const sha256Hex = (text) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text)

export const signIn = (form) => core.signIn(supabase, form, sha256Hex)
export const signUp = (form) => core.signUp(supabase, form, sha256Hex)
export const signOut = () => supabase.auth.signOut()
export { displayName } from '@overlap/core/api/auth'

// ── 카카오로 시작하기 (앱): 앱 안 브라우저로 카카오 로그인 → overlap://auth-callback 으로 돌아와 세션 받기 (PKCE)
// 처음이면 웹과 똑같이 카카오 닉네임·프로필 사진으로 자동 가입돼요.
// 돌아올 주소는 Supabase 로그인 설정의 Redirect URLs에 등록돼 있어야 해요.
WebBrowser.maybeCompleteAuthSession()

/** 성공하면 true, 사용자가 창을 닫으면 false. 실패하면 문구로 throw */
export async function signInWithKakao() {
  const redirectTo = Linking.createURL('auth-callback')
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'kakao', options: { redirectTo, skipBrowserRedirect: true } })
  if (error) throw new Error(`카카오 로그인을 시작하지 못했어요: ${error.message}`)
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (res.type !== 'success') return false
  const back = core.readAuthCallback(res.url)
  if (back.error) throw new Error(back.error)
  const { error: e2 } = await supabase.auth.exchangeCodeForSession(back.code)
  if (e2) throw new Error('카카오 로그인을 마치지 못했어요. 다시 시도해 주세요.')
  return true // App이 세션 변화를 받아 홈으로 넘어가요
}
