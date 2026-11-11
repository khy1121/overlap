import { useEffect, useState } from 'react'
import { MAX_DAYS, dayRange, durText, iso, nDays, nSlots, rangeError, rangeText } from '../lib/schedule'
import DurationPicker from './DurationPicker'

const HOURS = Array.from({ length: 25 }, (_, h) => h)
const input = 'min-h-[40px] rounded-[10px] border-0 bg-rule2 px-2.5 py-1.5 text-[14px] text-ink max-sm:text-base'
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const shift = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }
// 설정 화면에서 고칠 수 있는 칸
const KEYS = ['count', 'start', 'days', 'startHour', 'endHour', 'from', 'to', 'dur']
// 이 칸이 바뀌면 시간표 칸이 달라져서 확정 시간이 풀려요
const RESETS = ['start', 'days', 'startHour', 'endHour', 'from', 'to', 'dur']
const pick = (cfg) => {
  const [startHour] = dayRange(cfg, 0)
  const [, endHour] = dayRange(cfg, nDays(cfg) - 1)
  return { count: cfg.count, start: cfg.start, days: nDays(cfg), startHour, endHour, from: cfg.from, to: cfg.to, dur: cfg.dur }
}

/**
 * 약속 설정. 기간 / 만나는 시간 / 인원으로 나눠 보여 주고, 바꾼 내용은 '변경 저장'을 눌러야 반영돼요.
 * (고치는 도중의 잠깐 틀린 값으로 오류가 뜨거나 확정 시간이 풀리지 않게)
 * 약속 삭제·나가기는 약속 화면 맨 아래 빨간 버튼(MeetingExit)에 있어요.
 */
export default function SettingsBar({ cfg, onChange, onClose }) {
  const saved = pick(cfg)
  const [d, setD] = useState(saved)
  const changed = KEYS.filter((k) => d[k] !== saved[k])
  const dirty = changed.length > 0

  // 다른 사람이 설정을 바꿨을 때: 내가 고치던 게 없으면 새 값으로 맞춰요
  const savedKey = JSON.stringify(saved)
  useEffect(() => {
    if (!dirty) setD(JSON.parse(savedKey))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey])

  const view = { ...cfg, ...d } // 고치는 중인 값으로 계산
  const days = d.days
  const end = shift(d.start, days - 1)
  const err = rangeError(view)
  const unpicks = Boolean(cfg.picked) && changed.some((k) => RESETS.includes(k))
  const set = (patch) => setD((x) => ({ ...x, ...patch }))

  function save() {
    if (err || !dirty) return
    const patch = Object.fromEntries(changed.map((k) => [k, d[k]]))
    if (changed.some((k) => RESETS.includes(k))) patch.picked = null
    onChange(patch)
    onClose?.()
  }

  const hourSelect = (label, value, first, onPick) => (
    <select className={input} aria-label={label} value={value} onChange={(e) => onPick(Number(e.target.value))}>
      {HOURS.slice(first, first + 24).map((h) => <option key={h} value={h}>{h}시</option>)}
    </select>
  )

  return (
    <section className="flex flex-col gap-5 rounded-[20px] bg-sheet p-5 shadow-soft" aria-label="약속 설정">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[18px] font-bold">약속 설정</h2>
        {onClose && (
          <button className="btn-ghost btn-sm !px-2" aria-label="설정 닫기" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {/* 1. 기간 */}
      <Group title="기간">
        <div className="rounded-[14px] bg-pen-soft px-4 py-3">
          <div className="tabular font-mono text-[15px] font-semibold text-ink">{err ? '—' : rangeText(view)}</div>
          <div className="mt-0.5 text-xs text-ink2">총 {days}일{days > 2 ? ` · 가운데 날은 ${d.from}시–${d.to}시` : ''}</div>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <Card label="시작">
            <input className={`${input} min-w-0 flex-1`} type="date" aria-label="시작 날짜" value={d.start} onChange={(e) => e.target.value && set({ start: e.target.value })} />
            {hourSelect('시작 시각', d.startHour, 0, (h) => set({ startHour: h }))}
          </Card>
          <Card label="끝">
            <input
              className={`${input} min-w-0 flex-1`}
              type="date"
              aria-label="끝 날짜"
              min={d.start}
              max={shift(d.start, MAX_DAYS - 1)}
              value={end}
              onChange={(e) => e.target.value && set({ days: Math.round((parse(e.target.value) - parse(d.start)) / 86400000) + 1 })}
            />
            {hourSelect('끝 시각', d.endHour, 1, (h) => set({ endHour: h }))}
          </Card>
        </div>
        {days >= 2 && (
          <Card label="그 사이 날의 시간대" hint="첫날은 시작 시각부터, 마지막 날은 끝 시각까지만 칠해요.">
            {hourSelect('하루 시간대 시작', d.from, 0, (h) => set({ from: h }))}
            <span className="text-ink2">부터</span>
            {hourSelect('하루 시간대 끝', d.to, 1, (h) => set({ to: h }))}
            <span className="text-ink2">까지</span>
          </Card>
        )}
      </Group>

      {/* 2. 만나는 시간 */}
      <Group title="만나는 시간" aside={durText(d.dur)}>
        <DurationPicker compact value={d.dur} max={Math.min(24, Math.max(1, nSlots(view)))} onChange={(dur) => set({ dur })} />
      </Group>

      {/* 3. 인원 */}
      <Group title="예상 인원" hint="입력 현황(몇 명 중 몇 명이 칠했는지)을 보여 줄 때 써요.">
        <span className="inline-flex items-center self-start rounded-[12px] bg-rule2" role="group" aria-label="예상 인원">
          <button className="h-10 w-10 rounded-[12px] border-0 bg-transparent text-lg" aria-label="인원 줄이기" onClick={() => d.count > 1 && set({ count: d.count - 1 })}>−</button>
          <output className="min-w-[44px] text-center text-[15px] font-semibold text-ink tabular" aria-live="polite">{d.count}명</output>
          <button className="h-10 w-10 rounded-[12px] border-0 bg-transparent text-lg" aria-label="인원 늘리기" onClick={() => d.count < 50 && set({ count: d.count + 1 })}>+</button>
        </span>
      </Group>

      {/* 저장 */}
      {dirty && (
        <div className="sticky bottom-[max(12px,env(safe-area-inset-bottom,0px))] z-10 flex flex-col gap-2 rounded-[14px] bg-sheet p-3 shadow-soft ring-1 ring-rule">
          {err ? (
            <p className="m-0 text-[13px] font-semibold text-no" role="alert">{err}</p>
          ) : unpicks ? (
            <p className="m-0 text-[13px] text-ink2">저장하면 지금 확정된 시간이 풀려요. 다시 골라야 해요.</p>
          ) : null}
          <div className="flex gap-2">
            <button className="btn flex-1" onClick={() => setD(saved)}>되돌리기</button>
            <button className="btn-primary flex-[2] disabled:opacity-50" disabled={Boolean(err)} onClick={save}>변경 저장</button>
          </div>
        </div>
      )}

    </section>
  )
}

function Group({ title, aside, hint, children }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="m-0 text-[15px] font-bold">{title}</h3>
        {aside && <span className="text-[13px] font-semibold text-accent">{aside}</span>}
      </div>
      {hint && <p className="-mt-1.5 m-0 text-xs text-ink2">{hint}</p>}
      {children}
    </div>
  )
}

function Card({ label, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] border border-rule2 px-3 py-2.5">
      <span className="text-xs font-semibold text-ink2">{label}</span>
      <div className="flex flex-wrap items-center gap-2 text-[14px]">{children}</div>
      {hint && <span className="text-xs text-ink2">{hint}</span>}
    </div>
  )
}
