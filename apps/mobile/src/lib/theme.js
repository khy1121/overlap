// 앱 색·모서리: 웹과 같은 @overlap/core/tokens. 기기 설정(라이트/다크)을 따라요.
import { useColorScheme } from 'react-native'
import { brand, colors, radius } from '@overlap/core/tokens'

export function useTheme() {
  const mode = useColorScheme() === 'dark' ? 'dark' : 'light'
  return { mode, c: colors[mode], radius, brand }
}

/** 글꼴 크기·굵기 (웹의 화면 위계와 맞춰요) */
export const type = {
  title: { fontSize: 24, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 19 },
}
