import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

/**
 * 화면 아래에 고정된 바(하단 탭, 약속 화면 하단 바, 만들기 버튼 바 등)가 있으면 그 위에 띄울 높이.
 * 화면 맨 아래 가운데에 겹친 요소 중 position: fixed 인 것을 찾아 그 윗변을 기준으로 해요.
 */
function bottomOffset() {
  if (typeof document === 'undefined' || !document.elementsFromPoint) return 20
  const h = window.innerHeight
  let top = h
  for (const el of document.elementsFromPoint(window.innerWidth / 2, h - 2)) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') {
        top = Math.min(top, n.getBoundingClientRect().top)
        break
      }
    }
  }
  return top < h ? Math.round(h - top) + 12 : 20
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()

  const show = useCallback((text, action) => {
    clearTimeout(timer.current)
    setToast({ text, action, key: Date.now(), offset: bottomOffset() })
    timer.current = setTimeout(() => setToast(null), action ? 4000 : 2000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.key}
          role="status"
          className="fixed left-1/2 z-50 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-md bg-ink px-3.5 py-2 text-[13px] text-sheet"
          style={{ bottom: toast.offset > 20 ? `${toast.offset}px` : 'calc(20px + env(safe-area-inset-bottom, 0px))', animation: 'toast-in .2s var(--ease)' }}
        >
          {toast.text}
          {toast.action && (
            <button
              className="link-btn ml-2 text-inherit"
              style={{ color: 'inherit' }}
              onClick={() => {
                toast.action.run()
                setToast(null)
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
