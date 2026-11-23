// Google 캘린더 free/busy 권한만 따로 받는다 (Google Identity Services 토큰 방식).
// 로그인과는 별개이며, 일정 제목·내용은 읽을 수 없는 범위다.
export const CAL_SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy'
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

let loading
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true
      s.onload = resolve
      s.onerror = () => {
        loading = null
        reject(new Error('Google 연결 도구를 불러오지 못했어요.'))
      }
      document.head.append(s)
    })
  }
  return loading
}

/** Google 권한 창을 띄우고 access token을 돌려준다 */
export async function requestCalendarToken() {
  if (!GOOGLE_CLIENT_ID) throw new Error('캘린더 연동이 아직 설정되지 않았어요.')
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: CAL_SCOPE,
      callback: (res) => (res.error ? reject(new Error('캘린더 권한을 받지 못했어요.')) : resolve(res.access_token)),
      error_callback: () => reject(new Error('캘린더 연결을 취소했어요.')),
    })
    client.requestAccessToken()
  })
}
