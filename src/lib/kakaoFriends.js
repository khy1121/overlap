// 카톡 친구 중 Overlap 가입자 찾기.
// 카카오 '친구 목록' 동의는 로그인 때가 아니라 이 기능을 쓸 때만 받아요(이용 중 동의).
import { supabase } from './supabase'
import { hasKakao } from './auth'

// 처음 화면이 열릴 때 주소에 표시가 있으면 카카오 동의를 마치고 돌아온 것
export const RETURNED_FROM_KAKAO = new URLSearchParams(window.location.search).get('kakao_friends') === '1'

/** 카카오로 이동해 친구 목록 동의를 받고 돌아와요. 카카오가 연결 안 된 계정이면 연결까지 함께 */
export async function startKakaoFriends(user) {
  const options = { scopes: 'friends', redirectTo: `${window.location.origin}/?page=friends&kakao_friends=1` }
  const { error } = hasKakao(user)
    ? await supabase.auth.signInWithOAuth({ provider: 'kakao', options })
    : await supabase.auth.linkIdentity({ provider: 'kakao', options })
  if (error) throw new Error(`카카오로 이동하지 못했어요: ${error.message}`)
}

/**
 * 서버 함수(kakao-friends)가 카카오에 직접 확인한 '이 앱을 쓰는 카톡 친구' 목록.
 * [{ user_id, name, relation: 'none'|'pending'|'incoming'|'friend' }]
 * 카카오 토큰이 없으면 null (다시 동의 받아야 함)
 */
export async function fetchKakaoFriends() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.provider_token
  if (!token) return null
  const { data: res, error } = await supabase.functions.invoke('kakao-friends', { body: { kakao_token: token } })
  if (error) {
    let message = '카톡 친구를 찾지 못했어요. 잠시 후 다시 시도해 주세요.'
    try {
      const body = await error.context.json()
      if (body?.message) message = body.message
    } catch {
      if (error.context?.status === 404) message = '카톡 친구 찾기 기능이 아직 서버에 준비되지 않았어요.'
    }
    throw new Error(message)
  }
  return res.friends || []
}
