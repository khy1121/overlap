import { useEffect, useState } from 'react'
import {
  canPlaces, clearOrigin, currentPosition, distanceM, fetchMidpoint, fetchMyOrigin, kakaoToLink, kmText,
  nearbyStations, regionLabel, saveOrigin, searchCategory, searchKeyword, setOriginPublic,
} from '../lib/places'
import { useToast } from '../hooks/useToast'
import Avatar from './Avatar'

const CATS = [
  { code: 'CE7', label: '카페' },
  { code: 'FD6', label: '음식점' },
]

/**
 * 만날 장소 정하기 (확정된 약속에서).
 * 1) 내 출발지 입력(현재 위치 또는 검색) + 다른 사람에게 보일지 선택
 * 2) 2명 이상 입력하면 중간 지점 근처 역 후보 → 역 주변 카페·음식점 → '이 장소로 정하기'
 * 좌표는 본인만 읽을 수 있고, 다른 사람에게는 공개를 켰을 때만 동 이름이 보여요.
 */
export default function PlacePanel({ mid, cfg, people, myPid, onPlace, onClose }) {
  const toast = useToast()
  const [origin, setOrigin] = useState(undefined) // undefined 불러오는 중, null 없음
  const [busy, setBusy] = useState('')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [isPublic, setIsPublic] = useState(false)
  const [mid_, setMid] = useState(null) // { lat, lng, n }
  const [stations, setStations] = useState(null)
  const [station, setStation] = useState(null)
  const [cat, setCat] = useState('CE7')
  const [spots, setSpots] = useState(null)

  const setCount = people.filter((p) => p.origin_set).length

  useEffect(() => {
    fetchMyOrigin(myPid).then((o) => {
      setOrigin(o)
      if (o) setIsPublic(o.is_public)
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
    if (!station) return setSpots(null)
    let cancelled = false
    setSpots(null)
    searchCategory(cat, station, station.center ? 1000 : 400, 8)
      .then((l) => !cancelled && setSpots(l))
      .catch(() => !cancelled && setSpots([]))
    return () => { cancelled = true }
  }, [station, cat])

  async function save(pos, label) {
    setBusy('save')
    try {
      // 다른 사람에게 보이는 이름은 항상 동 단위로 (검색한 장소 이름은 쓰지 않아요: '○○아파트'처럼 집이 드러날 수 있어서)
      const lbl = (await regionLabel(pos)) || label || '위치'
      await saveOrigin(mid, { ...pos, label: lbl, isPublic })
      setOrigin({ ...pos, label: lbl, is_public: isPublic })
      setResults(null)
      setQuery('')
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
  function pick(p) {
    onPlace({ name: p.name, address: p.address, lat: p.lat, lng: p.lng, kakao_id: p.id || null, url: p.url || kakaoToLink(p), station: station?.center ? null : station?.name })
    toast(`만날 장소를 ‘${p.name}’으로 정했어요`)
  }

  const myDist = (p) => (origin ? kmText(distanceM(origin, p)) : null)

  if (!canPlaces()) {
    return (
      <Shell onClose={onClose}>
        <p className="m-0 text-[13px] text-ink2">장소 찾기가 아직 설정되지 않았어요. 카카오 JavaScript 키가 필요해요.</p>
      </Shell>
    )
  }

  return (
    <Shell onClose={onClose}>
      {/* 1. 내 출발지 */}
      <div className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">내 출발지</span>
        {origin === undefined && <p className="m-0 text-[13px] text-ink2">불러오는 중…</p>}
        {origin && (
          <div className="flex flex-wrap items-center gap-2 text-[14px]">
            <span className="rounded-full bg-pen-soft px-3 py-1 font-semibold">{origin.label}</span>
            <button className="btn-ghost btn-sm" onClick={remove}>지우기</button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button className="btn" disabled={Boolean(busy)} onClick={useHere}>
            {busy === 'gps' ? '위치 확인 중…' : origin ? '현재 위치로 바꾸기' : '현재 위치 쓰기'}
          </button>
          <form className="flex min-w-0 flex-1 gap-2" onSubmit={search}>
            <input
              className="field-input min-w-0 flex-1"
              placeholder="집·학교·회사 등 장소 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="출발지 검색"
            />
            <button className="btn-soft" type="submit" disabled={Boolean(busy)}>검색</button>
          </form>
        </div>
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
        <label className="flex items-center gap-2 text-[13px] text-ink2">
          <input type="checkbox" checked={isPublic} onChange={(e) => togglePublic(e.target.checked)} />
          다른 참여자에게 내 출발지 동네 보여주기 (예: 성북구 삼선동). 끄면 ‘입력함’만 보여요.
        </label>
        <p className="m-0 text-xs text-ink2">정확한 위치는 본인만 볼 수 있고, 중간 지점 계산에만 쓰여요. 이 약속에서만 저장되고 언제든 지울 수 있어요.</p>
      </div>

      {/* 2. 참여자 현황 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[15px] font-semibold">출발지 입력 {setCount}/{people.length}명</span>
        <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-[13px]">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5">
              <Avatar name={p.name} size={22} />
              <span className="font-medium text-ink">{p.name || '이름 없음'}</span>
              <span className="text-ink2">{p.origin_set ? p.origin_label || '입력함' : '아직'}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 3. 중간 지점 후보 */}
      <div className="flex flex-col gap-2">
        <span className="text-[15px] font-semibold">중간 지점 근처</span>
        {setCount < 2 && <p className="m-0 text-[13px] text-ink2">두 명 이상 출발지를 입력하면 중간 지점 근처 역과 가게를 추천해요.</p>}
        {setCount >= 2 && stations === null && <p className="m-0 text-[13px] text-ink2">중간 지점을 찾는 중…</p>}
        {stations && stations.length === 0 && mid_?.lat != null && (
          <p className="m-0 text-[13px] text-ink2">중간 지점 3km 안에 지하철역이 없어서 중간 지점 주변 가게를 보여드려요.</p>
        )}
        {stations && stations.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="역 후보">
            {stations.map((s) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={station?.id === s.id}
                className={`btn btn-sm ${station?.id === s.id ? '!bg-pen-strong !text-pen-ink' : ''}`}
                onClick={() => setStation(s)}
              >
                {s.name}
                {origin && <span className="ml-1 text-xs opacity-80">나 {myDist(s)}</span>}
              </button>
            ))}
          </div>
        )}
        {station && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-[10px] bg-rule2 p-0.5">
                {CATS.map((c) => (
                  <button key={c.code} className={`rounded-[8px] border-0 px-3 py-1 text-[13px] font-semibold ${cat === c.code ? 'bg-sheet text-ink shadow-soft' : 'bg-transparent text-ink2'}`} onClick={() => setCat(c.code)}>
                    {c.label}
                  </button>
                ))}
              </div>
              {!station.center && (
                <button className="btn-ghost btn-sm" onClick={() => pick(station)}>가게는 나중에, ‘{station.name}’으로만 정하기</button>
              )}
            </div>
            {spots === null && <p className="m-0 text-[13px] text-ink2">주변 가게를 찾는 중…</p>}
            {spots && spots.length === 0 && <p className="m-0 text-[13px] text-ink2">근처에서 찾지 못했어요. 다른 역이나 분류를 골라 보세요.</p>}
            {spots && spots.length > 0 && (
              <ul className="m-0 grid list-none grid-cols-1 gap-1 p-0 sm:grid-cols-2">
                {spots.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 rounded-[12px] bg-rule2 px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-ink">{p.name}</span>
                      <span className="block truncate text-xs text-ink2">{p.category} · {station.center ? '중간 지점' : station.name}에서 {kmText(p.distance)}</span>
                    </span>
                    {/* 카카오맵 가게 페이지(사진·영업시간·후기)를 새 탭으로 */}
                    <a href={p.url} target="_blank" rel="noreferrer" className="btn btn-sm shrink-0 no-underline" aria-label={`${p.name} 정보 보기 (카카오맵)`}>
                      정보
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4 10 14M18 13v6H5V6h6" /></svg>
                    </a>
                    <button className="btn-soft btn-sm shrink-0" onClick={() => pick(p)}>여기로</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {cfg.place && (
          <p className="m-0 text-[13px] text-ink2">
            지금 정해진 장소: <b className="text-ink">{cfg.place.name}</b>
            {' · '}
            <button className="btn-ghost btn-sm !px-1 text-no hover:text-no" onClick={() => onPlace(null)}>장소 취소</button>
          </p>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children, onClose }) {
  return (
    <section className="flex flex-col gap-5 rounded-[20px] bg-sheet p-5 shadow-soft" aria-label="만날 장소 정하기">
      <div className="flex items-center justify-between">
        <h2 className="m-0 text-[18px] font-bold">어디서 만날까요?</h2>
        <button className="btn-ghost btn-sm !px-2" aria-label="장소 창 닫기" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      {children}
    </section>
  )
}
