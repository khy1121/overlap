// 카카오톡 공유: 카톡 친구 선택 화면을 띄워 초대 카드를 보내요. (검수 없이 쓸 수 있는 기능)
// 카카오 앱의 JavaScript 키(공개용)와, 카카오 앱 설정 > 플랫폼 > Web 에 등록된 도메인에서만 동작해요.
export const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || ''
const SDK = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'
const SRI = 'sha384-DKYJZ8NLiK8MN4/C5P2dtSmLQ4KwPaoqAfyA/DfmEc1VDxu4yyC7wy6K1Hs90nka'

let loading
function loadKakao() {
  if (window.Kakao) return Promise.resolve(window.Kakao)
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SDK
      s.integrity = SRI
      s.crossOrigin = 'anonymous'
      s.async = true
      s.onload = () => resolve(window.Kakao)
      s.onerror = () => {
        loading = null
        reject(new Error('카카오톡 공유 도구를 불러오지 못했어요.'))
      }
      document.head.append(s)
    })
  }
  return loading
}

export const canKakaoShare = () => Boolean(KAKAO_JS_KEY)

/**
 * 카카오톡으로 카드 보내기.
 * @param {{ title: string, description: string, url: string, button?: string }} card
 */
export async function shareKakao({ title, description, url, button = '열어 보기' }) {
  if (!KAKAO_JS_KEY) throw new Error('카카오톡 공유가 아직 설정되지 않았어요.')
  const Kakao = await loadKakao()
  if (!Kakao.isInitialized()) Kakao.init(KAKAO_JS_KEY)
  const link = { mobileWebUrl: url, webUrl: url }
  Kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title,
      description,
      // 카카오 서버가 가져갈 수 있도록 배포 주소의 PNG 아이콘을 써요
      imageUrl: `${window.location.origin}/icons/icon-512.png`,
      imageWidth: 512,
      imageHeight: 512,
      link,
    },
    buttons: [{ title: button, link }],
  })
}

/** 공유 버튼용: 카카오 노란색 */
export const KAKAO_BTN = 'border-0 bg-[#FEE500] text-black/85 hover:bg-[#F5DC00]'
