// Expo는 npm workspaces 모노레포를 알아서 찾아요 (packages/core를 그대로 가져와요)
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Supabase 실시간 기능은 기기에 WebSocket이 없을 때만 Node용 'ws'를 불러와요(동적 import).
// 앱(React Native)에는 WebSocket이 있어서 그 길로 가지 않지만, 번들러가 'ws'(Node 전용 stream 사용)를 따라가다 깨지니 빈 모듈로 바꿔요.
const EMPTY_IN_APP = new Set(['ws'])

// @overlap/core/schedule 같은 하위 경로는 core의 package.json "exports"에 적혀 있어요.
// (core의 exports를 바꾸면 개발 서버를 다시 켜야 해요 — 시작할 때 한 번 읽어요)
const coreDir = path.resolve(__dirname, '../../packages/core')
const coreExports = require(path.join(coreDir, 'package.json')).exports

// React는 웹·앱이 같은 버전(19)을 쓰지만, 혹시 두 벌이 깔려도 packages/core 안의 훅이 앱과 같은 React를 쓰도록 앱 기준으로 풀어요.
const appOrigin = path.join(__dirname, 'package.json')
const APP_ONLY = /^(react|react-dom|scheduler)(\/.*)?$/

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const m = moduleName.match(/^@overlap\/core(?:\/(.+))?$/)
  if (m) {
    const target = coreExports[m[1] ? `./${m[1]}` : '.']
    if (target) return { type: 'sourceFile', filePath: path.join(coreDir, target) }
  }
  if (EMPTY_IN_APP.has(moduleName)) return { type: 'empty' }
  if (APP_ONLY.test(moduleName)) return context.resolveRequest({ ...context, originModulePath: appOrigin }, moduleName, platform)
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
