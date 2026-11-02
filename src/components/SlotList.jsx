import { summary, whenText } from '../lib/schedule'

export default function SlotList({ title, count, hint, items, empty, cfg, n, byId, onOpen }) {
  return (
    <section className="sheet">
      <h2 className="m-0 flex items-baseline gap-2 font-display text-base font-extrabold">
        {title}
        {count ? <span className="font-mono text-xs font-medium text-ink2">{count}개</span> : null}
      </h2>
      <p className="small mt-0.5">{hint}</p>
      <ul className="m-0 mt-2 list-none border-t border-rule p-0">
        {!items.length && <li className="px-1 py-2.5 text-[13px] text-ink2">{empty}</li>}
        {items.slice(0, 8).map((w) => (
          <li key={`${w.d}-${w.s}`} className="border-b border-rule2">
            <button
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 rounded-none bg-transparent px-1 py-[9px] text-left hover:bg-rule2 active:!transform-none"
              onClick={() => onOpen(w)}
            >
              <span className="tabular font-mono text-[13px] font-semibold">{whenText(cfg, w)}</span>
              <span className={`whitespace-nowrap rounded-[3px] px-[7px] py-px font-mono text-[11px] font-semibold text-ink ${w.all ? 'bg-yes-soft' : 'bg-maybe-soft'}`}>
                {w.all ? '전원' : `${w.g.y.length + w.g.m.length}/${n}`}
              </span>
              <span className="col-span-2 text-xs text-ink2">
                {w.all ? "모두 '가능'" : summary(w, n) + (w.g.n.length ? ` — 불가: ${w.g.n.map((id) => byId[id]?.name || '이름 없음').join(', ')}` : '')}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
