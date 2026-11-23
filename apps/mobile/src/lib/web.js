// 앱에 아직 없는 화면(약속 화면·새 약속)은 다음 단계에서 만들기 전까지 웹으로 열어요.
// 같은 계정으로 웹에 로그인돼 있으면 바로 이어서 쓸 수 있어요.
import { Linking } from 'react-native'
import { PROD_ORIGIN, meetingLink } from '@overlap/core/site'

export const openMeetingOnWeb = (mid) => Linking.openURL(meetingLink(mid))
export const openNewMeetingOnWeb = () => Linking.openURL(`${PROD_ORIGIN}/?page=new`)
export const openPrivacy = () => Linking.openURL(`${PROD_ORIGIN}/?page=privacy`)
