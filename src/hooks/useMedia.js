import { useSyncExternalStore } from 'react'

/** CSS 미디어 쿼리가 맞는지 실시간으로 알려 줘요. */
export function useMedia(query) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
