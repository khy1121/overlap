// Overlap 앱 설정. Supabase 주소·키는 웹과 같은 저장소 루트 .env.local(VITE_…)에서 읽어요.
// (publishable 키는 앱에 들어가도 되는 공개 키예요. 비밀 키는 여기 넣지 않아요)
const fs = require('fs')
const path = require('path')

function rootEnv() {
  const out = {}
  for (const f of ['.env', '.env.local']) {
    const p = path.join(__dirname, '..', '..', f)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
      if (m) out[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
  return out
}
const env = { ...rootEnv(), ...process.env }

const googleServices = process.env.GOOGLE_SERVICES_JSON || (fs.existsSync(path.join(__dirname, 'google-services.json')) ? './google-services.json' : null)

// EAS 프로젝트 (@rlagjsdud/overlap). 공개 값이에요. 빌드 서버에는 .env.local이 없어서 여기 직접 둬요
const EAS_PROJECT_ID = env.EXPO_PROJECT_ID || '77c8b76b-598c-4f11-853f-62290711d0dc'

module.exports = {
  expo: {
    name: 'Overlap',
    slug: 'overlap',
    owner: 'rlagjsdud',
    scheme: 'overlap',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    // Expo Go와 같은 새 아키텍처로 빌드 (확인한 환경과 같게)
    newArchEnabled: true,
    splash: { image: './assets/splash.png', resizeMode: 'contain', backgroundColor: '#F2F4F6' },
    ios: { bundleIdentifier: 'kr.overlap.app', supportsTablet: false },
    android: {
      // 지금 Play용 TWA와 같은 패키지 이름: 나중에 같은 서명 키로 업데이트해서 바꿀 수 있게
      package: 'kr.overlap.app',
      // 로그인 토큰이 기기 백업(구글 백업·adb)으로 빠져나가지 않게
      allowBackup: false,
      // Expo 기본 템플릿에 들어오지만 쓰지 않는 권한 (스토어 심사·데이터 보안 양식에 불필요한 항목이 생기지 않게)
      blockedPermissions: [
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'com.google.android.gms.permission.AD_ID',
      ],
      adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#FFFFFF' },
      // FCM(앱 알림): 빌드 서버는 EAS 파일 변수 GOOGLE_SERVICES_JSON, 내 컴퓨터는 apps/mobile/google-services.json (커밋 안 함)
      ...(googleServices ? { googleServicesFile: googleServices } : {}),
    },
    // 앱 알림: 안드로이드 알림 아이콘 색. FCM 설정(google-services.json)은 EAS 빌드 때 넣어요
    plugins: [['expo-notifications', { color: '#3182F6' }]],
    extra: {
      // Expo 푸시 토큰·EAS 빌드에 쓰는 프로젝트 id
      eas: { projectId: EAS_PROJECT_ID },
      supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL,
      // Google 캘린더 연결: 웹과 같은 공개 클라이언트 id (비밀값 아님)
      googleClientId: env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID,
      supabaseKey: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
  },
}
