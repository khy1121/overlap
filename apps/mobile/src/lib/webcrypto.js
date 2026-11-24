// 앱(React Native)에는 Web Crypto가 없어요. Supabase 로그인(PKCE)이 쓰는 두 가지만 expo-crypto로 채워요.
// 없으면 Supabase가 검증 코드를 Math.random으로 만들고, 코드 챌린지를 SHA-256 대신 plain으로 보내요.
import * as ExpoCrypto from 'expo-crypto'

const ALGORITHMS = {
  'SHA-1': ExpoCrypto.CryptoDigestAlgorithm.SHA1,
  'SHA-256': ExpoCrypto.CryptoDigestAlgorithm.SHA256,
  'SHA-384': ExpoCrypto.CryptoDigestAlgorithm.SHA384,
  'SHA-512': ExpoCrypto.CryptoDigestAlgorithm.SHA512,
}

const g = globalThis
if (!g.crypto) g.crypto = {}
if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = (array) => ExpoCrypto.getRandomValues(array)
}
if (!g.crypto.subtle) {
  g.crypto.subtle = {
    // Web Crypto와 같은 모양: digest('SHA-256', Uint8Array) → Promise<ArrayBuffer>
    digest: (algorithm, data) => {
      const name = typeof algorithm === 'string' ? algorithm : algorithm?.name
      const alg = ALGORITHMS[String(name).toUpperCase()]
      if (!alg) return Promise.reject(new Error(`지원하지 않는 해시: ${name}`))
      return ExpoCrypto.digest(alg, data)
    },
  }
}
