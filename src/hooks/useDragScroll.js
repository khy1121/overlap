import { useCallback, useRef } from 'react'

/**
 * 가로로 넘기는 목록을 PC에서 마우스로 끌어서 넘길 수 있게 해요. (터치는 원래대로 손가락 스크롤)
 * 사용: const drag = useDragScroll(); <ul ref={drag.ref} {...drag.handlers} className={... drag.className}>
 * 끌어서 넘긴 직후의 클릭은 막아서, 넘기다가 버튼이 눌리지 않게 해요.
 */
export function useDragScroll() {
  const el = useRef(null)
  const st = useRef(null) // { x, left, moved }

  const onPointerDown = useCallback((e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !el.current) return
    if (el.current.scrollWidth <= el.current.clientWidth) return // 넘칠 게 없으면 그냥 둬요
    st.current = { x: e.clientX, left: el.current.scrollLeft, moved: false, id: e.pointerId }
  }, [])

  const onPointerMove = useCallback((e) => {
    const s = st.current
    if (!s || !el.current) return
    const dx = e.clientX - s.x
    if (!s.moved && Math.abs(dx) < 5) return
    if (!s.moved) {
      s.moved = true
      el.current.setPointerCapture?.(s.id)
      el.current.style.cursor = 'grabbing'
      el.current.style.userSelect = 'none'
    }
    el.current.scrollLeft = s.left - dx
  }, [])

  const end = useCallback(() => {
    const s = st.current
    st.current = null
    if (!el.current || !s) return
    el.current.style.cursor = ''
    el.current.style.userSelect = ''
    if (s.moved) {
      // 끌기를 마친 순간 생기는 클릭 한 번은 버려요
      const stop = (ev) => { ev.stopPropagation(); ev.preventDefault() }
      el.current.addEventListener('click', stop, { capture: true, once: true })
      setTimeout(() => el.current?.removeEventListener('click', stop, { capture: true }), 0)
    }
  }, [])

  return {
    ref: el,
    handlers: { onPointerDown, onPointerMove, onPointerUp: end, onPointerCancel: end, onDragStart: (e) => e.preventDefault() },
    className: 'md:cursor-grab',
  }
}
