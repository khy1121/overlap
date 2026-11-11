import { useEffect, useState } from 'react'
import {
  canPlaces, clearOrigin, currentPosition, distanceM, fetchMidpoint, fetchMyOrigin, kakaoToLink, kmText,
  nearbyStations, regionLabel, saveOrigin, searchCategory, searchKeyword, setOriginPublic,
} from '../lib/places'
import { useToast } from '../hooks/useToast'
import Avatar from './Avatar'

// 중간 지점 근처에서 무엇을 볼지: 카페·음식점은 가게 목록, '역만'은 역 자체를 장소로
const KINDS = [
  { key: 'CE7', label: '카페' },
  { key: 'FD6', label: '음식점' },
  { key: 'station', label: '역에서 만나기' },
]

const seg = (on) =>
  `min-h-[36px] rounded-full border-0 px-3.5 text-[13px] font-semibold ${on ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`

/**
 * 만날 장소 정하기 (시간 확정 전에도 미리 정할 수 있어요).
 * - 정해진 곳이 있나요? → 장소 이름 검색
 * - 아직 못 정했나요? → ① 내 출발지 ② 중간 지점 근처 역·가게
 * 어느 쪽이든 '여기로'를 누르면 아래에서 확인·취소를 한 번 더 물어보고 저장해요.
 * 좌표는 본인만 읽을 수 있고, 다른 사람에게는 공개를 켰을 때만 동 이름이 보여요.
 */
export default function PlacePanel({ mid, cfg, people, myPid, onPlace, onClose }) {
  const toast = useToast()
  const [origin, setOrigin] = useState(undefined) // undefined 불러오는 중, null 없음
  const [editOrigin, setEditOrigin] = useState(false)
  const [busy, setBusy] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [isPublic, setIsPublic] = useState(false)
  const [mid_, setMid] = useState(null) // { lat, lng, n }
  const [stations, setStations] = useState(null)
  const [station, setStation] = useState(null)
  const [kind, setKind] = useState('CE7')
  const [spots, setSpots] = useState(null)
  // 'direct' 정해진 곳이 있어요 → 장소 검색 / 'mid' 아직 못 정했어요 → 출발지·중간 지점
  const [how, setHow] = useState(null)
  // '여기로'를 누른 장소 (확인 전)
  const [pending, setPending] = useState(null)

  const setCount = people.filter((p) => p.origin_set).length

  useEffect(() => {
    fetchMyOrigin(myPid).then((o) => {
      setOrigin(o)
      if (o) {
        setIsPublic(o.is_public)
        setHow((h) => h ?? 'mid') // 이미 출발지를 넣었으면 중간 지점 쪽을 바로 보여 줘요
      }
    })
  }, [myPid])

  // 입력 인원이 바뀔 때마다 중간점과 역 후보를 다시 구해요
  useEffect(() => {
    let cancelled = false
    setStations(null)
    setStation(null)
    fetchMidpoint(mid)
      .then(async (m) => {
        if (cancelled) return
        setMid(m)
        if (m.lat == null) return
        const list = await nearbyStations({ lat: m.lat, lng: m.lng })
        if (cancelled) return
        setStations(list)
        setStation(list[0] || { name: '중간 지점', lat: m.lat, lng: m.lng, center: true })
      })
      .catch((e) => toast(e.message))
    return () => { cancelled = true }
  }, [mid, setCount, toast])

  // 고른 역 주변 가게
  useEffect(() => {
    if (!station || kind === 'station') return setSpots(null)
    let cancelled = false
    setSpots(null)
    searchCategory(kind, station, station.center ? 1000 : 400, 8)
      .then((l) => !cancelled && setSpots(l))
      .catch(() => !cancelled && setSpots([]))
    return () => { cancelled = true }
  }, [station, kind])

  async function save(pos, label) {
    setBusy('save')
    try {
      // 다른 사람에게 보이는 이름은 항상 동 단위로 (검색한 장소 이름은 쓰지 않아요: '○○아파트'처럼 집이 드러날 수 있어서)
      const lbl = (await regionLabel(pos)) || label || '위치'
      await saveOrigin(mid, { ...pos, label: lbl, isPublic })
      setOrigin({ ...pos, label: lbl, is_public: isPublic })
      setResults(null)
      setQuery('')
      setEditOrigin(false)
      toast('출발지를 저장했어요')
    } catch (e) {
      toast(e.message)
    } finally {
      setBusy('')
    }
  }
  async function useHere() {
    setBusy('gps')
    try {
      const pos = await currentPosition()
      await save(pos)
    } catch (e) {
      toast(e.message)
      setBusy('')
    }
  }
  async function search(e) {
    e.preventDefault()
    const q = query.trim()
    if (q.length < 2) return toast('두 글자 이상 입력해 주세요')
    setBusy('search')
    try {
      setResults(await searchKeyword(q, origin))
    } catch (e) {
      toast(e.message)
    } finally {
      setBusy('')
    }
  }
  async function togglePublic(v) {
    setIsPublic(v)
    if (!origin) return
    try {
      await setOriginPublic(mid, v)
      setOrigin((o) => ({ ...o, is_public: v }))
    } catch (e) {
      toast(e.message)
      setIsPublic(!v)
    }
  }
  async function remove() {
    try {
      await clearOrigin(mid)
      setOrigin(null)
      toast('출발지를 지웠어요')
    } catch (e) {
      toast(e.message)
    }
  }
  function confirmPick() {
    onPlace(pending)
    toast(`만날 장소를 ‘${pending.name}’으로 정했어요`)
    setPending(null)
  }

  const myDist = (p) => (origin ? kmText(distanceM(origin, p)) : null)
  const isPending = (p) => pending && pending.kakao_id === (p.id || null) && pending.name === p.name
  const choose = (p, st = null) => setPending(placeOf(p, st))

  if (!canPlaces()) {
    return (
      <Shell onClose={onClose}>
        <p className="m-0 text-[13px] text-ink2">장소 찾기가 아직 설정되지 않았어요. 카카오 JavaScript 키가 필요해요.</p>
      </Shell>
    )
  }

  const showOriginForm = !origin || editOrigin

  return (
    <Shell onClose={onClose}>
      {cfg.place && (
        <div className="flex items-center gap-2 rounded-[14px] bg-pen-soft px-4 py-3">
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-ink2">정해진 장소</span>
            <b className="block truncate text-[15px] text-ink">📍 {cfg.place.name}</b>
            <span className="block truncate text-xs text-ink2">
              {cfg.place.station ? `${cfg.place.station} 근처 · ` : ''}
              <a href={cfg.place.url} target="_blank" rel="noreferrer" className="font-semibold text-accent underline">지도 보기</a>
            </span>
          </span>
          <button className="btn-ghost btn-sm shrink-0 !px-2 text-no hover:text-no" onClick={() => onPlace(null)}>장소 취소</button>
        </div>
      )}

      {/* 정해진 곳이 있는지 먼저 물어봐요 */}
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="장소 정하는 방법">
        {[
          ['direct', '정해진 곳이 있나요?', '장소 이름으로 찾기'],
          ['mid', '아직 못 정했나요?', '중간 지점 추천받기'],
        ].map(([k, title, sub]) => (
          <button
            key={k}
            role="tab"
            aria-selected={how === k}
            className={`flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-[14px] border-2 px-3.5 py-2.5 text-left ${how === k ? 'border-pen bg-pen-soft' : 'border-rule2 bg-transparent hover:bg-rule2'}`}
            onClick={() => { setHow(k); setPending(null) }}
          >
            <span className="text-[15px] font-bold text-ink">{title}</span>
            <span className="text-xs text-ink2">{sub}</span>
          </button>
        ))}
      </div>

      {how === 'direct' && <DirectPick near={origin} isPending={isPending} onChoose={(p) => choose(p)} />}

      {how === 'mid' && (
        <>
          {/* ① 내 출발지 */}
          <Part n={1} title="내 출발지">
            {origin === undefined && <p className="m-0 text-[13px] text-ink2">불러오는 중…</p>}
            {origin && !editOrigin && (
              <div className="flex items-center gap-2 rounded-[12px] bg-rule2 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">📍 {origin.label}</span>
                <button className="btn-ghost btn-sm" onClick={() => setEditOrigin(true)}>바꾸기</button>
                <button className="btn-ghost btn-sm text-ink2" onClick={remove}>지우기</button>
              </div>
            )}
            {origin !== undefined && showOriginForm && (
              <div className="flex flex-col gap-2">
                <button className="btn w-full" disabled={Boolean(busy)} onClick={useHere}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
                  {busy === 'gps' ? '위치 확인 중…' : '현재 위치 쓰기'}
                </button>
                <form className="flex gap-2" onSubmit={search}>
                  <input className="field-input min-w-0 flex-1" placeholder="또는 집·학교·회사 검색" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="출발지 검색" />
                  <button className="btn-soft" type="submit" disabled={Boolean(busy)}>검색</button>
                </form>
                {results && (
                  <ul className="m-0 flex max-h-[200px] list-none flex-col gap-0.5 overflow-auto p-0">
                    {results.length === 0 && <li className="py-1 text-[13px] text-ink2">검색 결과가 없어요.</li>}
                    {results.map((p) => (
                      <li key={p.id}>
                        <button className="flex w-full flex-col items-start gap-0 rounded-[10px] border-0 bg-transparent px-2 py-1.5 text-left hover:bg-rule2" onClick={() => save({ lat: p.lat, lng: p.lng }, p.name)}>
                          <span className="block w-full truncate text-[14px] font-semibold text-ink">{p.name}</span>
                          <span className="block w-full truncate text-xs text-ink2">{p.address}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {origin && <button className="btn-ghost btn-sm self-start" onClick={() => { setEditOrigin(false); setResults(null) }}>그대로 두기</button>}
              </div>
            )}
            <label className="flex items-center gap-2 text-[13px] text-ink2">
              <input type="checkbox" checked={isPublic} onChange={(e) => togglePublic(e.target.checked)} />
              다른 사람에게 내 동네 보여주기
            </label>
            <p className="-mt-1 m-0 text-xs text-ink2">정확한 위치는 나만 볼 수 있어요. 끄면 ‘입력함’으로만 보여요.</p>
          </Part>

          {/* ② 중간 지점 */}
          <Part n={2} title="중간 지점 근처">
            <OriginStatus people={people} myPid={myPid} setCount={setCount} />
            {setCount < 2 ? (
              <p className="m-0 rounded-[12px] bg-rule2 px-3.5 py-3 text-[13px] text-ink2">두 명 이상 출발지를 넣으면 가운데쯤의 역과 가게를 추천해요. 초대한 사람들에게도 입력을 부탁해 보세요.</p>
            ) : stations === null ? (
              <p className="m-0 text-[13px] text-ink2">중간 지점을 찾는 중…</p>
            ) : (
              <>
                {stations.length === 0 && mid_?.lat != null && (
                  <p className="m-0 text-xs text-ink2">근처에 지하철역이 없어서 중간 지점 주변을 보여 드려요.</p>
                )}
                {stations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="역 후보">
                    {stations.map((s) => (
                      <button key={s.id} role="tab" aria-selected={station?.id === s.id} className={seg(station?.id === s.id)} onClick={() => { setStation(s); setPending(null) }}>
                        {s.name}
                        {origin && <span className="ml-1 text-[11px] font-medium opacity-75">나 {myDist(s)}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {station && (
                  <div className="flex flex-wrap gap-1.5 border-t border-rule2 pt-2.5" role="tablist" aria-label="무엇을 볼까요">
                    {KINDS.filter((k) => k.key !== 'station' || !station.center).map((k) => (
                      <button key={k.key} role="tab" aria-selected={kind === k.key} className={seg(kind === k.key)} onClick={() => { setKind(k.key); setPending(null) }}>
                        {k.label}
                      </button>
                    ))}
                  </div>
                )}
                {station && kind === 'station' && !station.center && (
                  <PlaceRow p={{ ...station, category: '지하철역' }} sub={origin ? `나에게서 ${myDist(station)}` : '지하철역'} on={isPending(station)} onChoose={() => choose(station, station.name)} />
                )}
                {station && kind !== 'station' && (
                  <>
                    {spots === null && <p className="m-0 text-[13px] text-ink2">주변 가게를 찾는 중…</p>}
                    {spots && spots.length === 0 && <p className="m-0 text-[13px] text-ink2">근처에서 찾지 못했어요. 다른 역이나 분류를 골라 보세요.</p>}
                    {spots && spots.length > 0 && (
                      <ul className="m-0 flex max-h-[320px] list-none flex-col gap-1 overflow-auto p-0">
                        {spots.map((p) => (
                          <li key={p.id}>
                            <PlaceRow
                              p={p}
                              sub={`${p.category} · ${station.center ? '중간 지점' : station.name}에서 ${kmText(p.distance)}`}
                              on={isPending(p)}
                              onChoose={() => choose(p, station.center ? null : station.name)}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </>
            )}
          </Part>
        </>
      )}

      {/* '여기로'를 누르면 한 번 더 확인 */}
      {pending && (
        <div className="sticky bottom-[max(12px,env(safe-area-inset-bottom,0px))] z-10 flex flex-col gap-2.5 rounded-[16px] bg-sheet p-3.5 shadow-soft ring-1 ring-rule" role="dialog" aria-label="장소 확인">
          <div className="min-w-0">
            <div className="text-xs text-ink2">이 곳으로 정할까요?</div>
            <div className="truncate text-[15px] font-bold">📍 {pending.name}</div>
            <div className="truncate text-xs text-ink2">{[pending.station && `${pending.station} 근처`, pending.address].filter(Boolean).join(' · ')}</div>
          </div>
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <button className="btn min-h-[46px]" onClick={() => setPending(null)}>취소</button>
            <button className="btn-primary min-h-[46px]" onClick={confirmPick}>확인</button>
          </div>
        </div>
      )}
    </Shell>
  )
}

/** 약속에 저장할 장소 모양 */
function placeOf(p, station) {
  return { name: p.name, address: p.address, lat: p.lat, lng: p.lng, kakao_id: p.id || null, url: p.url || kakaoToLink(p), station: station || null }
}

/** 장소 한 줄: 이름·설명 + 정보(카카오맵) + 여기로 */
function PlaceRow({ p, sub, on, onChoose }) {
  return (
    <div className={`flex items-center gap-2 rounded-[12px] px-3 py-2 ${on ? 'bg-pen-soft ring-2 ring-pen' : 'bg-rule2'}`}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-ink">{p.name}</span>
        <span className="block truncate text-xs text-ink2">{sub}</span>
      </span>
      {p.url && (
        <a href={p.url} target="_blank" rel="noreferrer" className="btn btn-sm shrink-0 no-underline" aria-label={`${p.name} 정보 보기 (카카오맵)`}>정보</a>
      )}
      <button className={`btn-sm shrink-0 ${on ? 'btn-primary' : 'btn-soft'}`} onClick={onChoose}>{on ? '선택됨' : '여기로'}</button>
    </div>
  )
}

/** 출발지 입력 현황: 참여자 카드처럼 진행 막대 + 가로로 넘기는 아바타 (넣은 사람은 초록 체크, 아래에 동네) */
function OriginStatus({ people, myPid, setCount }) {
  const pct = people.length ? Math.round((setCount / people.length) * 100) : 0
  return (
    <div className="flex flex-col gap-2 rounded-[14px] border border-rule2 px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className="text-[13px] font-semibold">출발지 입력</span>
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2 text-xs text-ink2">
          <span className="h-1.5 w-full max-w-[100px] overflow-hidden rounded-full bg-rule" aria-hidden="true">
            <span className="block h-full rounded-full bg-yes" style={{ width: `${pct}%` }} />
          </span>
          <span className="shrink-0 tabular">{setCount}/{people.length}명</span>
        </span>
      </div>
      <ul className="-mx-1 m-0 flex list-none gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {people.map((p) => {
          const me = p.id === myPid
          const on = p.origin_set
          return (
            <li key={p.id} className="flex w-[64px] shrink-0 flex-col items-center gap-0.5" title={on ? p.origin_label || '입력함' : '아직 안 넣음'}>
              <span className="relative">
                <span className={`block rounded-full p-[2px] ${on ? 'bg-yes' : 'bg-rule'}`}>
                  <span className="block rounded-full bg-sheet p-[2px]">
                    <Avatar name={p.name} url={p.avatar_url} size={34} className={on ? '' : 'opacity-50'} />
                  </span>
                </span>
                {on && (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-yes text-white ring-2 ring-sheet" aria-hidden="true">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                )}
              </span>
              <span className="w-full truncate text-center text-[12px] font-semibold leading-tight">{me ? '나' : p.name || '이름 없음'}</span>
              <span className={`w-full truncate text-center text-[10px] leading-tight ${on ? 'text-ink2' : 'text-ink2 opacity-60'}`}>
                {on ? (p.origin_label || '입력함').split(' ').pop() : '아직'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** 장소 이름으로 검색해서 고르기 (중간 지점과 상관없이) */
function DirectPick({ near, isPending, onChoose }) {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [list, setList] = useState(null)
  async function find(e) {
    e.preventDefault()
    const t = q.trim()
    if (t.length < 2) return toast('두 글자 이상 입력해 주세요')
    setBusy(true)
    try {
      setList(await searchKeyword(t, near || undefined))
    } catch (err) {
      toast(err.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-2">
      <form className="flex gap-2" onSubmit={find}>
        <input className="field-input min-w-0 flex-1" placeholder="만날 곳 이름 (예: 강남역 스타벅스)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="만날 장소 검색" />
        <button className="btn-soft" type="submit" disabled={busy}>{busy ? '찾는 중…' : '검색'}</button>
      </form>
      {list && (
        <ul className="m-0 flex max-h-[320px] list-none flex-col gap-1 overflow-auto p-0">
          {list.length === 0 && <li className="py-1 text-[13px] text-ink2">검색 결과가 없어요. 다른 이름으로 찾아보세요.</li>}
          {list.map((p) => (
            <li key={p.id}>
              <PlaceRow p={p} sub={[p.category, p.address].filter(Boolean).join(' · ')} on={isPending(p)} onChoose={() => onChoose(p)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Part({ n, title, aside, children }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-rule2 pt-4">
      <div className="flex items-center gap-2.5">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-pen-soft text-[12px] font-extrabold text-accent">{n}</span>
        <h3 className="m-0 flex-1 text-[15px] font-bold">{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  )
}

function Shell({ children, onClose }) {
  return (
    <section className="flex flex-col gap-4 rounded-[20px] bg-sheet p-4 shadow-soft sm:p-5" aria-label="만날 장소 정하기">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[18px] font-bold">어디서 만날까요?</h2>
        {onClose && (
          <button className="btn-ghost btn-sm !px-2" aria-label="장소 창 닫기" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>
      {children}
    </section>
  )
}
