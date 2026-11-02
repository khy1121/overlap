import { useState } from 'react'

export default function Avatar({ name, url, size = 22, className = '' }) {
  const [broken, setBroken] = useState(false)
  const initial = Array.from(name || '?')[0]
  return (
    <span
      className={`avatar grid flex-none place-items-center overflow-hidden rounded-full bg-cell font-semibold text-ink2 ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.48) }}
    >
      {url && !broken ? (
        <img src={url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        initial
      )}
    </span>
  )
}
