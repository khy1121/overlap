// 다른 사람에게 보내는 링크의 기준 주소.
// 로컬 개발(localhost)에서 초대를 보내도 받는 사람은 배포 주소로 열려야 해요.
// 로그인 리다이렉트처럼 '지금 이 브라우저'로 돌아와야 하는 곳에는 쓰지 않아요.
export const PROD_ORIGIN = 'https://overlap-liard.vercel.app'
export const APP_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(window.location.origin) ? PROD_ORIGIN : window.location.origin
