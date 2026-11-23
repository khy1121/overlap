import { dayLabel, effDur, timeText } from '../lib/schedule'
import Avatar from './Avatar'

/** 후보 시간의 30분 칸 키들 */
export const windowKeys = (cfg, w) => Array.from({ length: effDur(cfg) }, (_, k) => `${w.d}-${w.s + k}`)

const CHOICES = [
  { v: 'y', label: '가능', on: 'bg-yes-soft text-ink ring-2 ring-inset ring-yes' },
  { v: 'm', label: '애매', on: 'bg-maybe-soft text-ink ring-2 ring-inset ring-maybe' },
  { v: 'n', label: '안 돼요', on: 'bg-rule text-ink ring-2 ring-inset ring-ink2' },
]

/**
 * 늦게 들어온 사람용: 시간표 대신 가망 있는 후보에만 가능 / 애매 / 안 돼요.
 * 고른 값은 그 후보 시간의 30분 칸에 저장돼서 추천 계산은 그대로예요.
 */
export default function CandidatePoll({ cfg, candidates, cells, byId, answered, onVote, onSeeAll }) {
  const valueOf = (w) => {
    const vals = new Set(windowKeys(cfg, w).map((k) => cells[k] || ''))
    return vals.size === 1 ? [...vals][0] : ''
  }
  const done = candidates.filter((w) => valueOf(w)).length
  const voters = Object.values(byId).filter((p) => Object.keys(p.cells || {}).length).slice(0, 6)
  return (
    <section className="flex flex-col gap-2.5" aria-label="후보에 투표">
      <div className="flex items-center gap-2 rounded-md bg-pen-soft px-3 py-2.5">
        <span className="flex -space-x-1.5" aria-hidden="true">
          {voters.map((p) => <Avatar key={p.id} name={p.name} url={p.avatar_url} size={24} className="ring-2 ring-pen-soft" />)}
        </span>
        <span className="text-[13px] font-semibold text-accent">{answered}명이 답했어요. 이 중에서 골라 주세요</span>
      </div>
      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {candidates.map((w) => {
          const v = valueOf(w)
          const yes = w.g.y.length
          return (
            <li key={`${w.d}-${w.s}`} className="rounded-md bg-sheet px-3.5 py-3">
              <div className="text-[15px] font-bold">{dayLabel(cfg, w.d)} <span className="tabular font-mono">{timeText(cfg, w.s)}</span></div>
              <div className="text-[12px] text-ink2">{yes}명 가능{w.g.m.length ? ` · ${w.g.m.length}명 애매` : ''}</div>
              <div className="mt-2 grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={`${dayLabel(cfg, w.d)} ${timeText(cfg, w.s)}`}>
                {CHOICES.map((c) => (
                  <button
                    key={c.v}
                    type="button"
                    role="radio"
                    aria-checked={v === c.v}
                    className={`min-h-[44px] rounded-[12px] border-0 text-[14px] font-semibold ${v === c.v ? c.on : 'bg-rule2 text-ink2'}`}
                    onClick={() => onVote(windowKeys(cfg, w), v === c.v ? '' : c.v)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ol>
      <div className="flex items-center justify-between px-0.5 text-[12px] text-ink2">
        <span>{done}/{candidates.length}개 골랐어요 · 바로 저장돼요</span>
        <button className="border-0 bg-transparent p-1 text-[13px] font-semibold text-accent" onClick={onSeeAll}>다른 시간도 보기 ›</button>
      </div>
    </section>
  )
}
