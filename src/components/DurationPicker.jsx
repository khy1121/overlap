import { useState } from 'react'

const QUICK = [2, 4, 6, 8, 10] // 30분 칸 단위: 1~5시간

/**
 * 만나는 시간 고르기: 1~5시간은 칩으로 바로, 그 밖은 '직접 입력'(시간, 30분 단위).
 * value/onChange는 30분 칸 수(예: 3 = 1시간 30분). max도 칸 수.
 */
export default function DurationPicker({ value, onChange, max = 24, compact = false }) {
  const [custom, setCustom] = useState(!QUICK.includes(value))
  const [text, setText] = useState(String(value / 2))
  const chip = (on) =>
    `min-h-[40px] rounded-[12px] border-0 px-3.5 text-sm font-semibold ${on ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`

  function commit(raw) {
    const hours = Number(raw)
    if (!Number.isFinite(hours) || hours <= 0) return
    const slots = Math.max(1, Math.min(max, Math.round(hours * 2)))
    onChange(slots)
    setText(String(slots / 2))
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${compact ? '' : 'mt-0.5'}`} role="group" aria-label="만나는 시간">
      {QUICK.map((q) => (
        <button
          key={q}
          type="button"
          aria-pressed={!custom && value === q}
          disabled={q > max}
          className={chip(!custom && value === q)}
          onClick={() => { setCustom(false); onChange(q); setText(String(q / 2)) }}
        >
          {q / 2}시간
        </button>
      ))}
      <button type="button" aria-pressed={custom} className={chip(custom)} onClick={() => setCustom(true)}>
        직접 입력
      </button>
      {custom && (
        <label className="flex items-center gap-1.5 text-sm text-ink2">
          <input
            type="number"
            inputMode="decimal"
            min={0.5}
            max={max / 2}
            step={0.5}
            aria-label="만나는 시간(시간)"
            className="field-input w-[96px] text-center tabular"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commit(e.currentTarget.value))}
          />
          시간
        </label>
      )}
    </div>
  )
}
