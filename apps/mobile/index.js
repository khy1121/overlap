// Supabase가 쓰는 URL API를 React Native에서도 쓸 수 있게 (가장 먼저)
import 'react-native-url-polyfill/auto'
// Supabase 로그인(PKCE)이 쓰는 crypto.getRandomValues·crypto.subtle.digest (Supabase 클라이언트보다 먼저)
import './src/lib/webcrypto'
import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
