import { createContext, useCallback, useContext, useRef, useState } from 'react'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()

  const show = useCallback((text, action) => {
    clearTimeout(timer.current)
    setToast({ text, action, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), action ? 4000 : 2000)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.key}
          role="status"
          className="fixed left-1/2 z-20 max-w-[calc(100%-32px)] -translate-x-1/2 rounded-md bg-ink px-3.5 py-2 text-[13px] text-sheet"
          style={{ bottom: 'calc(20px + env(safe-area-inset-bottom, 0px))', animation: 'toast-in .2s var(--ease)' }}
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
