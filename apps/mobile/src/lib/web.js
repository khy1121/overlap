// 웹으로 여는 페이지 (개인정보처리방침)
import { Linking } from 'react-native'
import { PROD_ORIGIN } from '@overlap/core/site'

export const openPrivacy = () => Linking.openURL(`${PROD_ORIGIN}/?page=privacy`)
