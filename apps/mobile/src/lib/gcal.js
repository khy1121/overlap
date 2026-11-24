// Google 캘린더 연결 (앱): 웹과 같은 Google 웹 클라이언트로 권한 창을 열고,
// 웹의 중계 페이지(gcal-callback.html)를 거쳐 overlap://gcal 로 토큰을 받아요. free/busy 전용 권한이에요.
// Google Cloud의 승인된 리디렉션 URI에 https://overlap-liard.vercel.app/gcal-callback.html 이 있어야 해요.
import Constants from 'expo-constants'
import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { googleAuthUrl, readGoogleReturn, withNonce } from '@overlap/core/api/calendar'
import { PROD_ORIGIN } from '@overlap/core/site'

const clientId = Constants.expoConfig?.extra?.googleClientId
export const canGoogle = Boolean(clientId)

/** 권한을 받으면 access token, 창을 닫으면 null. 실패하면 문구로 throw */
export async function requestCalendarToken() {
  if (!clientId) throw new Error('캘린더 연동이 아직 설정되지 않았어요.')
  // 이번 요청만의 nonce: 다른 곳에서 시작한 연결 결과가 들어와도 받지 않게
  const nonce = Array.from(Crypto.getRandomBytes(18), (b) => b.toString(16).padStart(2, '0')).join('')
  const returnUrl = withNonce(Linking.createURL('gcal'), nonce)
  const res = await WebBrowser.openAuthSessionAsync(googleAuthUrl({ clientId, origin: PROD_ORIGIN, returnUrl }), returnUrl)
  if (res.type !== 'success') return null
  const back = readGoogleReturn(res.url, nonce)
  if (back.error) throw new Error(back.error)
  return back.token
}
