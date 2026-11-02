// Overlap 서비스 워커: 앱 설치(PWA)와 빠른 재방문용.
// - 페이지 이동: 네트워크 먼저, 끊기면 저장해 둔 첫 화면
// - 빌드 파일(/assets)·아이콘·이미지: 한 번 받으면 캐시에서
// - Supabase·Google 등 다른 주소 요청은 건드리지 않아요.
const CACHE = 'overlap-v1'
const SHELL = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/brand/mascot.webp']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  if (/^\/(assets|icons|brand)\//.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
