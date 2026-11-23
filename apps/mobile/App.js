import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { supabase } from './src/lib/supabase'
import { useTheme } from './src/lib/theme'
import LoginScreen from './src/screens/LoginScreen'
import HomeScreen from './src/screens/HomeScreen'

// 앱 시작: 저장된 세션이 있으면 홈, 없으면 로그인. 로그인·로그아웃은 세션 변화로 화면이 바뀌어요.
export default function App() {
  const { mode, c } = useTheme()
  const [session, setSession] = useState(undefined) // undefined = 아직 모름

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      {session === undefined ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.paper }}>
          <ActivityIndicator color={c.pen} />
        </View>
      ) : session ? (
        <HomeScreen session={session} />
      ) : (
        <LoginScreen />
      )}
    </>
  )
}
