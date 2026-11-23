// 장소 (웹·앱 공통). 카카오 장소 결과 모양 맞추기, 거리, 길찾기 링크, 출발지·중간 지점 서버 호출.
// 검색 자체는 웹은 카카오맵 JS SDK, 앱은 서버 함수(kakao-local, REST)로 해요. 결과 모양은 같아요(toPlace).

/** 카카오 장소 결과 → { id, name, address, category, lat, lng, url, distance } */
export const toPlace = (p) => ({
  id: p.id,
  name: p.place_name,
  address: p.road_address_name || p.address_name || '',
  category: (p.category_name || '').split(' > ').pop(),
  lat: Number(p.y),
  lng: Number(p.x),
  url: p.place_url,
  distance: p.distance ? Number(p.distance) : null,
})

/** 약속에 저장하는 장소 모양 (웹 PlacePanel과 같아요) */
export const toMeetingPlace = (p, station) => ({
  name: p.name, address: p.address, lat: p.lat, lng: p.lng, kakao_id: p.id || null, url: p.url || kakaoToLink(p), station: station || null,
})

/** 역 이름에서 노선 꼬리표 떼기: '홍대입구역 2호선' → '홍대입구역' */
export const baseStation = (name) => name.replace(/\s+.*$/, '')

/** 역 목록에서 같은 역(여러 노선)을 하나로 합쳐 앞에서 n곳 */
export function uniqueStations(list, n = 3) {
  const seen = new Set()
  const out = []
  for (const p of list) {
    const key = baseStation(p.name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...p, name: key, lines: [p.category] })
    if (out.length === n) break
  }
  return out
}

/** 행정구역 결과 → '성북구 삼선동' (못 찾으면 '') */
export function regionText(docs) {
  const r = (docs || []).find((x) => x.region_type === 'H') || (docs || [])[0]
  return r ? [r.region_2depth_name, r.region_3depth_name].filter(Boolean).join(' ') : ''
}

/** 두 좌표 사이 직선거리(m) */
export function distanceM(a, b) {
  const R = 6371000
  const toRad = (x) => (x * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
export const kmText = (m) => (m == null ? '' : m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`)

/** 카카오맵 길찾기 링크 (출발지는 앱에서 사용자가 고르게) */
export const kakaoToLink = (p) => `https://map.kakao.com/link/to/${encodeURIComponent(p.name)},${p.lat},${p.lng}`

// ----- 앱: 서버 함수(kakao-local)로 검색 -----

async function local(db, body) {
  const { data, error } = await db.functions.invoke('kakao-local', { body })
  if (error) {
    let code = ''
    try { code = (await error.context.json())?.error || '' } catch { /* 본문 없음 */ }
    if (code === 'not_configured' || error.context?.status === 404) throw new Error('장소 검색이 아직 서버에 준비되지 않았어요.')
    throw new Error('장소를 찾지 못했어요. 잠시 후 다시 시도해 주세요.')
  }
  return data?.documents || []
}

/** 키워드 검색. near가 있으면 그 근처 먼저. 최대 10개 */
export const searchKeyword = async (db, query, near) =>
  (await local(db, { op: 'keyword', query, size: 10, ...(near ? { lat: near.lat, lng: near.lng } : {}) })).map(toPlace)

/** 카테고리 주변 검색 (가까운 순). code: SW8 지하철역, CE7 카페, FD6 음식점 */
export const searchCategory = async (db, code, center, radius, size = 15) =>
  (await local(db, { op: 'category', code, lat: center.lat, lng: center.lng, radius, size })).map(toPlace)

/** 중심점 근처 역 후보 3곳 */
export const nearbyStations = async (db, center, radius = 3000) => uniqueStations(await searchCategory(db, 'SW8', center, radius, 15))

/** 좌표 → '성북구 삼선동' */
export const regionLabel = async (db, { lat, lng }) => regionText(await local(db, { op: 'region', lat, lng }))

// ----- 출발지·중간 지점 (서버) -----

/** 내 출발지 (좌표는 본인만 읽을 수 있어요). 없으면 null */
export async function fetchMyOrigin(db, pid) {
  if (!pid) return null
  const { data } = await db.from('origins').select('lat,lng,label,is_public').eq('participant_id', pid).maybeSingle()
  return data || null
}
export async function saveOrigin(db, mid, { lat, lng, label, isPublic }) {
  const { error } = await db.rpc('set_origin', { mid, p_lat: lat, p_lng: lng, p_label: label, p_public: isPublic })
  if (error) throw new Error('출발지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
}
export async function setOriginPublic(db, mid, isPublic) {
  const { error } = await db.rpc('set_origin_public', { mid, p_public: isPublic })
  if (error) throw new Error('공개 설정을 바꾸지 못했어요.')
}
export async function clearOrigin(db, mid) {
  const { error } = await db.rpc('clear_origin', { mid })
  if (error) throw new Error('출발지를 지우지 못했어요.')
}
/** 출발지들의 중심점 { lat, lng, n }. 2명 미만이면 lat/lng는 null */
export async function fetchMidpoint(db, mid) {
  const { data, error } = await db.rpc('meeting_midpoint', { mid })
  if (error) throw new Error('중간 지점을 계산하지 못했어요.')
  const row = Array.isArray(data) ? data[0] : data
  return row || { lat: null, lng: null, n: 0 }
}
