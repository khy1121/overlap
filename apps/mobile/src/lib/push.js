// 앱 알림 (Expo 푸시). 웹 푸시와 같은 서버 함수(push-send)가 이 기기 토큰으로도 보내요.
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { removeAppToken, saveAppToken } from '@overlap/core/api/notify'
import { supabase } from './supabase'

const KEY = 'overlap:push-token'
const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId

// 앱을 보고 있을 때 온 알림도 위에 띄워요
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
})

/**
 * 이 기기의 알림 상태
 * 'no-project' 아직 EAS 프로젝트가 없어 토큰을 못 받아요(개발 중) | 'denied' 폰 설정에서 막힘 | 'off' 꺼짐 | 'on' 켜짐
 */
export async function appPushState() {
  if (!projectId) return 'no-project'
  const { status, canAskAgain } = await Notifications.getPermissionsAsync()
  // Android 13+는 아직 묻지 않은 권한도 'denied'로 알려 줘요. 다시 물어볼 수 있으면 '꺼짐'(스위치로 켜기)으로 봐요
  if (status === 'denied' && !canAskAgain) return 'denied'
  return status === 'granted' && (await AsyncStorage.getItem(KEY)) ? 'on' : 'off'
}

/** 알림 켜기: 권한 요청 → 토큰 받기 → 서버에 이 기기 등록 */
export async function enableAppPush() {
  if (!projectId) throw new Error('앱 설치판에서 켤 수 있어요. (개발 중에는 알림 기기 등록이 꺼져 있어요)')
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: '약속 알림', importance: Notifications.AndroidImportance.HIGH })
  }
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') throw new Error('알림이 막혀 있어요. 폰 설정 → 앱 → Overlap → 알림에서 허용해 주세요.')
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
  await saveAppToken(supabase, token, Platform.OS === 'ios' ? 'ios' : 'android')
  await AsyncStorage.setItem(KEY, token)
}

/** 알림 끄기 (로그아웃할 때도): 이 기기를 서버에서 빼요 */
export async function disableAppPush() {
  const token = await AsyncStorage.getItem(KEY)
  if (token) await removeAppToken(supabase, token).catch(() => {})
  await AsyncStorage.removeItem(KEY)
}

/** 앱을 열 때: 켜 둔 기기면 토큰을 다시 등록해요 (토큰이 바뀌었거나 다른 계정으로 로그인했을 수 있어서) */
export async function refreshAppPush() {
  if ((await appPushState()) !== 'on') return
  await enableAppPush().catch(() => {})
}

/** 알림을 눌렀을 때 담겨 온 웹 주소 (/?m=…) */
export const urlOfResponse = (r) => r?.notification?.request?.content?.data?.url
