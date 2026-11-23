// 다른 사람에게 보내는 링크의 기준 주소 (앱·로컬 개발에서 만든 초대도 배포된 웹으로 열려요)
export const PROD_ORIGIN = 'https://overlap-liard.vercel.app'
export const meetingLink = (mid, origin = PROD_ORIGIN) => `${origin}/?m=${mid}`
