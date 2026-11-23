// Expo SDK 52는 npm workspaces 모노레포를 알아서 찾아요 (packages/core를 그대로 가져와요)
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// @overlap/core/schedule 같은 하위 경로는 core의 package.json "exports"에 적혀 있어요.
// Metro의 exports 읽기를 전체로 켜면 다른 패키지(Supabase의 ws 등)가 Node용 파일로 풀려서,
// @overlap/core만 그 표를 보고 직접 찾아 줘요.
const coreDir = path.resolve(__dirname, '../../packages/core')
const coreExports = require(path.join(coreDir, 'package.json')).exports
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const m = moduleName.match(/^@overlap\/core(?:\/(.+))?$/)
  if (m) {
    const target = coreExports[m[1] ? `./${m[1]}` : '.']
    if (target) return { type: 'sourceFile', filePath: path.join(coreDir, target) }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
