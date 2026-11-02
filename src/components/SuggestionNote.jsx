import { dayLabel, summary, tm } from '../lib/schedule'
import Avatar from './Avatar'

const STATUS_TITLE = { y: '가능', m: '조율 필요', n: '불가', u: '미입력' }

export default function SuggestionNote({ cfg, result, list, cand, byId, onNext, onPick, onCopy, swapKey }) {
  const { entered, n } = result
  if (!entered || !list.length) {
    return (
      <div className="note">
        <div className="font-hand text-[30px] leading-none text-pen">이 시간 어때요?</div>
        <div className="mt-2 font-display text-[19px] font-extrabold leading-tight">
          {entered ? '아직 겹치는 시간이 없어요' : '아직 아무도 입력하지 않았어요'}
        </div>
        <div className="mt-1.5 text-[13px] text-ink2">
          {entered
            ? "'가능'이나 '조율' 칸이 더 모이면 골라 드릴게요."
            : '되는 시간을 칠하고 사람들을 초대해 보세요. 모두에게 맞는 시간을 여기서 제안해요.'}
        </div>
      </div>
    )
  }
  const w = list[cand % list.length]
  return (
    <div className="note swap" key={swapKey}>
      <div className="font-hand text-[30px] leading-none text-pen">{w.all ? '이 시간 어때요? 다 돼요!' : '이 시간 어때요?'}</div>
      <div className="when mt-2 text-balance font-display text-[25px] font-extrabold leading-tight">
        {dayLabel(cfg, w.d)}
        <br />
        <span className="tabular font-mono text-[22px] font-semibold tracking-tight">
          {tm(cfg, w.s)}–{tm(cfg, w.s + cfg.dur)}
        </span>
      </div>
      <div className="mt-1.5 text-[13px] text-ink2">{summary(w, n)}</div>
      <div className="att mt-3 flex flex-wrap gap-1.5">
        {['y', 'm', 'n', 'u'].flatMap((k) =>
          w.g[k].map((pid) => {
            const p = byId[pid]
            return (
              <span key={pid} className={`tok ${k} inline-flex items-center gap-1.5 rounded-full border border-rule bg-sheet py-0.5 pl-[3px] pr-2.5 text-xs`} title={`${p?.name || '이름 없음'}: ${STATUS_TITLE[k]}`}>
                <Avatar name={p?.name} url={p?.avatar_url} size={18} />
                {p?.name || '이름 없음'}
              </span>
            )
          }),
        )}
        {w.missing > 0 && <span className="tok u rounded-full border border-rule px-2.5 py-0.5 text-xs">아직 안 들어온 {w.missing}명</span>}
      </div>
      <div className="mt-3.5 flex flex-wrap gap-1.5">
        <button className="btn-primary" onClick={() => onPick(w)}>이 시간으로 확정</button>
        {list.length > 1 && <button className="btn" onClick={onNext}>다른 시간 {(cand % list.length) + 1}/{list.length}</button>}
        <button className="btn" onClick={() => onCopy(w)}>제안 문구 복사</button>
      </div>
    </div>
  )
}
