import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Ionicons } from '@expo/vector-icons'
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { supabase } from './src/lib/supabase'
import { useTheme } from './src/lib/theme'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'
import ScheduleScreen from './src/screens/ScheduleScreen'
import FriendsScreen from './src/screens/FriendsScreen'
import SettingsScreen from './src/screens/SettingsScreen'

const Tab = createBottomTabNavigator()
const Stack = createNativeStackNavigator()
const ICONS = { Home: 'calendar-outline', Schedule: 'today-outline', Friends: 'people-outline' }

/** 하단 탭: 약속(홈) · 내 일정 · 친구 — 웹의 하단 탭과 같아요. 설정은 홈 오른쪽 위 아바타에서 */
function Tabs({ session }) {
  const { c } = useTheme()
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c['ink-2'],
        tabBarStyle: { backgroundColor: c.sheet, borderTopColor: c.rule },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name]} color={color} size={size} />,
      })}
    >
      <Tab.Screen name="Home" options={{ title: '약속' }}>{(p) => <HomeScreen {...p} session={session} />}</Tab.Screen>
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ title: '내 일정' }} />
      <Tab.Screen name="Friends" component={FriendsScreen} options={{ title: '친구' }} />
    </Tab.Navigator>
  )
}

// 앱 시작: 저장된 세션이 있으면 탭 화면, 없으면 로그인. 로그인·로그아웃·탈퇴는 세션 변화로 화면이 바뀌어요.
export default function App() {
  const { mode, c } = useTheme()
  const [session, setSession] = useState(undefined) // undefined = 아직 모름

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // React Navigation 색도 같은 토큰으로
  const base = mode === 'dark' ? DarkTheme : DefaultTheme
  const navTheme = { ...base, colors: { ...base.colors, primary: c.accent, background: c.paper, card: c.sheet, text: c.ink, border: c.rule } }

  if (session === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper }}>
        <ActivityIndicator color={c.pen} />
      </View>
    )
  }
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {session ? (
        <Stack.Navigator>
          <Stack.Screen name="Tabs" options={{ headerShown: false }}>{() => <Tabs session={session} />}</Stack.Screen>
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: '설정', headerBackTitle: '뒤로' }} />
        </Stack.Navigator>
      ) : (
        <LoginScreen />
      )}
    </NavigationContainer>
  )
}
