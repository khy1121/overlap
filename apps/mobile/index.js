// Supabase가 쓰는 URL API를 React Native에서도 쓸 수 있게 (가장 먼저)
import 'react-native-url-polyfill/auto'
import { registerRootComponent } from 'expo'
import App from './App'

registerRootComponent(App)
