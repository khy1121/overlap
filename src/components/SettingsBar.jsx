const HOURS = Array.from({ length: 25 }, (_, h) => h)
const field = 'flex items-center gap-2 border-b border-rule2 px-3.5 py-2.5 text-[13px] text-ink2 max-sm:flex-[1_1_50%] sm:border-b-0 sm:border-r sm:last:border-r-0'
const input = 'rounded border border-rule bg-paper px-2 py-1 font-mono text-[13px] text-ink max-sm:text-base'

export default function SettingsBar({ cfg, onChange, onInvalid }) {
  return (
    <section className="flex flex-wrap items-stretch rounded-md border border-rule bg-sheet" aria-label="회의 설정">
      <div className={field}>
        <span id="countLbl">예상 인원</span>
        <span className="inline-flex items-center rounded border border-rule bg-paper" role="group" aria-labelledby="countLbl">
          <button className="h-8 w-8 hover:bg-cell" aria-label="인원 줄이기" onClick={() => cfg.count > 1 && onChange({ count: cfg.count - 1 })}>−</button>
          <output className="min-w-[30px] text-center font-mono font-semibold text-ink" aria-live="polite">{cfg.count}</output>
          <button className="h-8 w-8 hover:bg-cell" aria-label="인원 늘리기" onClick={() => cfg.count < 50 && onChange({ count: cfg.count + 1 })}>+</button>
        </span>
      </div>
      <label className={field}>
        시작일
        <input className={input} type="date" value={cfg.start} onChange={(e) => e.target.value && onChange({ start: e.target.value, picked: null })} />
      </label>
      <label className={field}>
        시간대
        <select
          className={input}
          value={cfg.from}
          onChange={(e) => {
            const v = Number(e.target.value)
            v < cfg.to ? onChange({ from: v, picked: null }) : onInvalid('시작 시간은 끝 시간보다 빨라야 해요')
          }}
        >
          {HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{h}시</option>)}
        </select>
        ~
        <select
          className={input}
          aria-label="끝 시간"
          value={cfg.to}
          onChange={(e) => {
            const v = Number(e.target.value)
            v > cfg.from ? onChange({ to: v, picked: null }) : onInvalid('끝 시간은 시작 시간보다 늦어야 해요')
          }}
        >
          {HOURS.slice(1).map((h) => <option key={h} value={h}>{h}시</option>)}
        </select>
      </label>
      <label className={field}>
        회의 길이
        <select className={input} value={cfg.dur} onChange={(e) => onChange({ dur: Number(e.target.value) })}>
          <option value={1}>30분</option>
          <option value={2}>1시간</option>
          <option value={3}>1시간 30분</option>
          <option value={4}>2시간</option>
          <option value={6}>3시간</option>
        </select>
      </label>
    </section>
  )
}
