// Google 캘린더 연결 (앱): 웹과 같은 Google 웹 클라이언트로 권한 창을 열고,
// 웹의 중계 페이지(gcal-callback.html)를 거쳐 overlap://gcal 로 토큰을 받아요. free/busy 전용 권한이에요.
// Google Cloud의 승인된 리디렉션 URI에 https://overlap-liard.vercel.app/gcal-callback.html 이 있어야 해요.
import Constants from 'expo-constants'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { googleAuthUrl, readGoogleReturn } from '@overlap/core/api/calendar'
import { PROD_ORIGIN } from '@overlap/core/site'

const clientId = Constants.expoConfig?.extra?.googleClientId
export const canGoogle = Boolean(clientId)

/** 권한을 받으면 access token, 창을 닫으면 null. 실패하면 문구로 throw */
export async function requestCalendarToken() {
  if (!clientId) throw new Error('캘린더 연동이 아직 설정되지 않았어요.')
  const returnUrl = Linking.createURL('gcal')
  const res = await WebBrowser.openAuthSessionAsync(googleAuthUrl({ clientId, origin: PROD_ORIGIN, returnUrl }), returnUrl)
  if (res.type !== 'success') return null
  const back = readGoogleReturn(res.url)
  if (back.error) throw new Error(back.error)
  return back.token
}
