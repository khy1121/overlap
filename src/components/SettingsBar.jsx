import { useState } from 'react'
import { iso, nDays } from '../lib/schedule'
import DurationPicker from './DurationPicker'

const HOURS = Array.from({ length: 25 }, (_, h) => h)
const MAX_DAYS = 14
const field = 'flex flex-wrap items-center gap-2 border-b border-rule2 px-3.5 py-2.5 text-[13px] text-ink2 last:border-b-0'
const input = 'rounded-[10px] border-0 bg-rule2 px-2.5 py-1.5 text-[13px] text-ink max-sm:text-base'
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const shift = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }

/** 약속 설정: 인원, 기간(시작~종료), 하루 시간대, 만나는 시간. 맨 아래에 약속 삭제(만든 사람) 또는 나가기(참여자) */
export default function SettingsBar({ cfg, onChange, onInvalid, isOwner, onDelete, onLeave }) {
  const days = nDays(cfg)
  const end = shift(cfg.start, days - 1)
  return (
    <section className="flex flex-col rounded-[20px] bg-sheet shadow-soft" aria-label="약속 설정">
      <div className={field}>
        <span id="countLbl" className="w-[72px] shrink-0">예상 인원</span>
        <span className="inline-flex items-center rounded-[10px] bg-rule2" role="group" aria-labelledby="countLbl">
          <button className="h-8 w-8 rounded-[10px] border-0 bg-transparent" aria-label="인원 줄이기" onClick={() => cfg.count > 1 && onChange({ count: cfg.count - 1 })}>−</button>
          <output className="min-w-[30px] text-center font-semibold text-ink tabular" aria-live="polite">{cfg.count}</output>
          <button className="h-8 w-8 rounded-[10px] border-0 bg-transparent" aria-label="인원 늘리기" onClick={() => cfg.count < 50 && onChange({ count: cfg.count + 1 })}>+</button>
        </span>
      </div>
      <div className={field}>
        <span className="w-[72px] shrink-0">기간</span>
        <input
          className={input}
          type="date"
          aria-label="시작일"
          value={cfg.start}
          onChange={(e) => e.target.value && onChange({ start: e.target.value, picked: null })}
        />
        ~
        <input
          className={input}
          type="date"
          aria-label="종료일"
          min={cfg.start}
          max={shift(cfg.start, MAX_DAYS - 1)}
          value={end}
          onChange={(e) => {
            if (!e.target.value) return
            const n = Math.round((parse(e.target.value) - parse(cfg.start)) / 86400000) + 1
            if (n < 1) return onInvalid('종료일은 시작일과 같거나 뒤여야 해요')
            if (n > MAX_DAYS) return onInvalid(`기간은 최대 ${MAX_DAYS}일까지예요`)
            onChange({ days: n, picked: null })
          }}
        />
        <span className="font-semibold text-accent">{days}일</span>
      </div>
      <label className={field}>
        <span className="w-[72px] shrink-0">하루 시간대</span>
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
      <div className={field}>
        <span className="w-[72px] shrink-0">만나는 시간</span>
        <DurationPicker compact value={cfg.dur} max={Math.min(24, (cfg.to - cfg.from) * 2)} onChange={(dur) => onChange({ dur, picked: null })} />
      </div>
      {isOwner ? (
        <DangerRow
          label="이 약속을 지우면 모든 참여자의 일정 입력도 함께 사라져요. 되돌릴 수 없어요."
          button="약속 삭제"
          confirm="정말 삭제"
          onConfirm={onDelete}
        />
      ) : (
        <DangerRow
          label="나가면 이 약속에 입력한 내 일정이 지워져요. 초대 링크로 다시 들어올 수 있어요."
          button="약속 나가기"
          confirm="정말 나가기"
          onConfirm={onLeave}
        />
      )}
    </section>
  )
}

/** 되돌릴 수 없는 동작: 버튼을 한 번 누르면 설명과 함께 확인 버튼이 나와요 */
function DangerRow({ label, button, confirm, onConfirm }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
      setOpen(false)
    }
  }
  return (
    <div className={field}>
      {open ? (
        <>
          <span className="min-w-0 flex-1 basis-[220px] text-no">{label}</span>
          <span className="flex gap-1.5">
            <button className="btn btn-sm !bg-no !text-white hover:opacity-90 disabled:opacity-50" disabled={busy} onClick={go}>
              {busy ? '처리 중…' : confirm}
            </button>
            <button className="btn btn-sm" disabled={busy} onClick={() => setOpen(false)}>취소</button>
          </span>
        </>
      ) : (
        <button className="btn-ghost btn-sm -ml-2 text-no hover:text-no" onClick={() => setOpen(true)}>{button}</button>
      )}
    </div>
  )
}
