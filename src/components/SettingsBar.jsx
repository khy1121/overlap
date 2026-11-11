import { useEffect, useState } from 'react'
import { MAX_DAYS, dayRange, durText, nDays, nSlots, rangeError, rangeText } from '../lib/schedule'
import { TIME_PRESETS, addDays, chip, datePresets, daysBetween, tile } from '../lib/presets'
import DurationPicker from './DurationPicker'

const HOURS = Array.from({ length: 25 }, (_, h) => h)
// 저장할 때 비교하는 칸
const KEYS = ['count', 'start', 'days', 'startHour', 'endHour', 'from', 'to', 'dur']
// 이 칸이 바뀌면 시간표 칸이 달라져서 확정 시간이 풀려요
const RESETS = ['start', 'days', 'startHour', 'endHour', 'from', 'to', 'dur']

/** 지금 약속 설정 → 화면에서 고치는 모양 */
function toDraft(cfg) {
  const days = nDays(cfg)
  const [startHour] = dayRange(cfg, 0)
  const [, endHour] = dayRange(cfg, days - 1)
  const one = days === 1
  return {
    start: cfg.start,
    end: addDays(cfg.start, days - 1),
    from: one ? startHour : cfg.from,
    to: one ? endHour : cfg.to,
    split: !one && (startHour !== cfg.from || endHour !== cfg.to),
    startHour,
    endHour,
    dur: cfg.dur,
    count: cfg.count,
  }
}

/** 고치는 모양 → 저장하는 값 (schedule.js 계산에도 그대로 써요) */
function toValues(d) {
  const days = d.start && d.end ? daysBetween(d.start, d.end) : 0
  const split = d.split && days > 1
  return {
    count: d.count,
    start: d.start,
    days,
    from: d.from,
    to: d.to,
    startHour: split ? d.startHour : d.from,
    endHour: split ? d.endHour : d.to,
    dur: d.dur,
  }
}

/**
 * 약속 설정: 새 약속 만들기와 같은 빠른 선택(기간·시간대) + 필요할 때만 직접 정하기.
 * 바꾼 내용은 아래 '확인'을 눌러야 저장되고, '취소'는 그대로 닫아요.
 * 약속 삭제·나가기는 약속 화면 맨 아래 빨간 버튼(MeetingExit)에 있어요.
 */
export default function SettingsBar({ cfg, onChange, onClose }) {
  const presets = datePresets()
  const saved = toValues(toDraft(cfg))
  const [d, setD] = useState(() => toDraft(cfg))
  const [customDate, setCustomDate] = useState(false)
  const [customTime, setCustomTime] = useState(false)
  const v = toValues(d)
  const changed = KEYS.filter((k) => v[k] !== saved[k])
  const dirty = changed.length > 0

  // 다른 사람이 설정을 바꿨을 때: 내가 고치던 게 없으면 새 값으로 맞춰요
  const savedKey = JSON.stringify(saved)
  useEffect(() => {
    if (!dirty) setD(toDraft(cfg))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey])

  const view = { ...cfg, ...v } // 고치는 중인 값으로 계산
  const one = v.days === 1
  const err = v.days >= 1 ? rangeError(view) : '날짜를 확인해 주세요'
  const unpicks = Boolean(cfg.picked) && changed.some((k) => RESETS.includes(k))
  const set = (patch) => setD((x) => ({ ...x, ...patch }))
  const datePreset = customDate ? null : presets.find((p) => p.start === d.start && p.end === d.end)
  const timePreset = customTime || (d.split && !one) ? null : TIME_PRESETS.find((p) => p.from === d.from && p.to === d.to)

  function setStart(e) {
    const start = e.target.value
    if (!start) return
    // 시작일을 바꾸면 기간 길이는 유지하고 끝 날짜를 따라 옮겨요
    setD((x) => ({ ...x, start, end: addDays(start, Math.min(Math.max(0, daysBetween(x.start, x.end) - 1), MAX_DAYS - 1)) }))
  }
  function confirm() {
    if (err) return
    if (dirty) {
      const patch = Object.fromEntries(changed.map((k) => [k, v[k]]))
      if (changed.some((k) => RESETS.includes(k))) patch.picked = null
      onChange(patch)
    }
    onClose?.()
  }

  const hourSelect = (label, value, first, onPick) => (
    <select className="field-input w-[92px] shrink-0" aria-label={label} value={value} onChange={(e) => onPick(Number(e.target.value))}>
      {HOURS.slice(first, first + 24).map((h) => <option key={h} value={h}>{h}시</option>)}
    </select>
  )

  return (
    <section className="flex flex-col gap-4 rounded-[20px] bg-sheet p-4 shadow-soft sm:p-5" aria-label="약속 설정">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[18px] font-bold">약속 설정</h2>
        <button className="btn-ghost btn-sm !px-2" aria-label="설정 닫기 (저장 안 함)" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* 1. 언제 */}
      <Step n={1} title="언제쯤 만날까요?" aside={v.days >= 1 && v.days <= MAX_DAYS ? `${v.days}일` : null}>
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <button key={p.key} type="button" aria-pressed={datePreset?.key === p.key} className={chip(datePreset?.key === p.key)} onClick={() => { setCustomDate(false); set({ start: p.start, end: p.end }) }}>
              {p.label}
            </button>
          ))}
          <button type="button" aria-pressed={!datePreset} className={chip(!datePreset)} onClick={() => setCustomDate(true)}>직접 정하기</button>
        </div>
        {!datePreset && (
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink2">
              시작 날짜
              <input className="field-input" type="date" value={d.start} onChange={setStart} />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-ink2">
              끝 날짜
              <input className="field-input" type="date" min={d.start} max={addDays(d.start, MAX_DAYS - 1)} value={d.end} onChange={(e) => e.target.value && set({ end: e.target.value })} />
            </label>
          </div>
        )}
      </Step>

      {/* 2. 몇 시쯤 */}
      <Step n={2} title="몇 시쯤이 좋을까요?">
        <div className="grid grid-cols-4 gap-1.5">
          {TIME_PRESETS.map((p) => (
            <button key={p.key} type="button" aria-pressed={timePreset?.key === p.key} className={tile(timePreset?.key === p.key)} onClick={() => { setCustomTime(false); set({ from: p.from, to: p.to, split: false }) }}>
              {p.label}
              <span className="text-[11px] font-medium opacity-80">{p.sub}</span>
            </button>
          ))}
          <button type="button" aria-pressed={!timePreset} className={tile(!timePreset)} onClick={() => setCustomTime(true)}>
            직접
            <span className="text-[11px] font-medium opacity-80">시간 고르기</span>
          </button>
        </div>
        {!timePreset && (
          <div className="flex flex-col gap-2.5 rounded-[14px] border border-rule2 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink2">
              <span className="basis-full text-xs font-semibold">{one ? '시간' : '매일'}</span>
              {hourSelect('시간대 시작', d.from, 0, (h) => set({ from: h }))}
              부터
              {hourSelect('시간대 끝', d.to, 1, (h) => set({ to: h }))}
              까지
            </div>
            {!one && (
              <label className="flex items-center gap-2 text-[13px] text-ink2">
                <input type="checkbox" checked={d.split} onChange={(e) => set({ split: e.target.checked, startHour: d.from, endHour: d.to })} />
                첫날 시작·마지막 날 끝 시각은 따로 정하기 (예: 오늘 12시 ~ 모레 22시)
              </label>
            )}
            {d.split && !one && (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm text-ink2">
                  <span className="basis-full text-xs font-semibold">첫날</span>
                  {hourSelect('첫날 시작 시각', d.startHour, 0, (h) => set({ startHour: h }))}
                  부터
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-ink2">
                  <span className="basis-full text-xs font-semibold">마지막 날</span>
                  {hourSelect('마지막 날 끝 시각', d.endHour, 1, (h) => set({ endHour: h }))}
                  까지
                </div>
              </>
            )}
          </div>
        )}
      </Step>

      {/* 3. 얼마나 */}
      <Step n={3} title="얼마나 만날까요?" aside={durText(d.dur)}>
        <DurationPicker compact value={d.dur} max={Math.min(24, Math.max(1, nSlots(view) || 1))} onChange={(dur) => set({ dur })} />
      </Step>

      {/* 4. 인원 */}
      <Step n={4} title="몇 명이 모여요?">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-ink2">예상 인원 <span className="text-xs">(입력 현황 표시에 써요)</span></span>
          <span className="inline-flex items-center rounded-[12px] bg-rule2" role="group" aria-label="예상 인원">
            <button type="button" className="h-9 w-9 rounded-[12px] border-0 bg-transparent text-lg" aria-label="인원 줄이기" onClick={() => set({ count: Math.max(1, d.count - 1) })}>−</button>
            <output className="min-w-[44px] text-center text-[15px] font-semibold tabular" aria-live="polite">{d.count}명</output>
            <button type="button" className="h-9 w-9 rounded-[12px] border-0 bg-transparent text-lg" aria-label="인원 늘리기" onClick={() => set({ count: Math.min(50, d.count + 1) })}>+</button>
          </span>
        </div>
      </Step>

      {/* 요약 + 취소·확인 */}
      <div className="sticky bottom-[max(12px,env(safe-area-inset-bottom,0px))] z-10 flex flex-col gap-2.5 rounded-[16px] bg-sheet p-3.5 shadow-soft ring-1 ring-rule">
        {err ? (
          <p className="m-0 text-[13px] font-semibold text-no" role="alert">{err}</p>
        ) : (
          <div className="min-w-0">
            <div className="tabular font-mono text-[13px] font-semibold text-ink">{rangeText(view)}</div>
            <div className="text-xs text-ink2">
              {v.days > 2 && `가운데 날 ${d.from}–${d.to}시 · `}{durText(d.dur)} · {d.count}명
              {dirty ? <span className="font-semibold text-accent"> · 바뀐 내용 있음</span> : ''}
            </div>
            {unpicks && <div className="mt-1 text-xs font-semibold text-no">확인을 누르면 지금 확정된 시간이 풀려요.</div>}
          </div>
        )}
        <div className="grid grid-cols-[1fr_2fr] gap-2">
          <button type="button" className="btn min-h-[46px]" onClick={onClose}>취소</button>
          <button type="button" className="btn-primary min-h-[46px] disabled:opacity-50" disabled={Boolean(err)} onClick={confirm}>
            {dirty ? '확인' : '닫기'}
          </button>
        </div>
      </div>
    </section>
  )
}

function Step({ n, title, aside, children }) {
  return (
    <div className="flex flex-col gap-3 border-t border-rule2 pt-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pen-soft text-[12px] font-extrabold text-accent">{n}</span>
        <h3 className="m-0 flex-1 text-[15px] font-bold">{title}</h3>
        {aside && <span className="text-[13px] font-semibold text-accent">{aside}</span>}
      </div>
      {children}
    </div>
  )
}
