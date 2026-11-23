// Overlap 서비스 워커: 앱 설치(PWA)와 빠른 재방문용.
// - 페이지 이동: 네트워크 먼저, 끊기면 저장해 둔 첫 화면
// - 빌드 파일(/assets)·아이콘·이미지: 한 번 받으면 캐시에서
// - Supabase·Google 등 다른 주소 요청은 건드리지 않아요.
// v3: 알림 기능 추가 (v2: HTML을 JS로 잘못 저장한 캐시 정리)
const CACHE = 'overlap-v3'
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
            // 서버가 없는 파일 대신 HTML을 준 경우는 저장하지 않아요 (흰 화면 방지)
            const type = res.headers.get('content-type') || ''
            if (res.ok && !type.includes('text/html')) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})

// ── 앱 알림 ─────────────────────────────────────────────
// 서버(push-send)가 보낸 { title, body, url, tag } 를 알림으로 보여 줘요
self.addEventListener('push', (e) => {
  let data = {}
  try {
    data = e.data ? e.data.json() : {}
  } catch {
    data = { body: e.data ? e.data.text() : '' }
  }
  e.waitUntil(
    self.registration.showNotification(data.title || 'Overlap', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { url: typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/' },
    }),
  )
})

// 알림을 누르면 열려 있는 앱 창으로 가거나 새로 열어요 (우리 사이트 주소만)
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const target = new URL(e.notification.data?.url || '/', self.location.origin).href
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => new URL(w.url).origin === self.location.origin)
      if (win) return win.navigate(target).then((w) => (w || win).focus())
      return self.clients.openWindow(target)
    }),
  )
})
