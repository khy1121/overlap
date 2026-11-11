// 만날 장소 찾기: 카카오맵 JS SDK(services)로 좌표→동 이름, 키워드·카테고리 검색을 해요.
// 서버 없이 브라우저에서 돌고, 카카오 앱의 JavaScript 키와 Web 플랫폼 도메인에서만 동작해요.
// 카카오 개발자 콘솔에서 앱의 '카카오맵'을 켜 둬야 해요.
import { KAKAO_JS_KEY } from './kakao'
import { supabase } from './supabase'

const SDK = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&libraries=services&autoload=false`
export const canPlaces = () => Boolean(KAKAO_JS_KEY)

let loading
/** 카카오맵 SDK를 한 번만 불러와요 (장소 패널을 열 때만) */
export function loadMaps() {
  if (window.kakao?.maps?.services) return Promise.resolve(window.kakao.maps)
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SDK
      s.async = true
      s.onload = () => window.kakao.maps.load(() => resolve(window.kakao.maps))
      s.onerror = () => {
        loading = null
        reject(new Error('지도 도구를 불러오지 못했어요.'))
      }
      document.head.append(s)
    })
  }
  return loading
}

/** 브라우저 위치 권한으로 현재 좌표 */
export function currentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('이 브라우저는 위치를 지원하지 않아요.'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => reject(new Error(e.code === 1 ? '위치 권한을 허용하지 않았어요. 대신 장소를 검색해 주세요.' : '현재 위치를 가져오지 못했어요.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    )
  })
}

/** 좌표 → '성북구 삼선동' (행정동). 못 찾으면 '' */
export async function regionLabel({ lat, lng }) {
  const maps = await loadMaps()
  return new Promise((resolve) => {
    new maps.services.Geocoder().coord2RegionCode(lng, lat, (res, status) => {
      if (status !== maps.services.Status.OK) return resolve('')
      const r = res.find((x) => x.region_type === 'H') || res[0]
      resolve(r ? [r.region_2depth_name, r.region_3depth_name].filter(Boolean).join(' ') : '')
    })
  })
}

const toPlace = (p) => ({
  id: p.id,
  name: p.place_name,
  address: p.road_address_name || p.address_name || '',
  category: (p.category_name || '').split(' > ').pop(),
  lat: Number(p.y),
  lng: Number(p.x),
  url: p.place_url,
  distance: p.distance ? Number(p.distance) : null,
})

/** 키워드로 장소 검색 (출발지 고르기용). 최대 10개 */
export async function searchKeyword(query, near) {
  const maps = await loadMaps()
  const ps = new maps.services.Places()
  const opt = { size: 10 }
  if (near) Object.assign(opt, { location: new maps.LatLng(near.lat, near.lng) })
  return new Promise((resolve) => {
    ps.keywordSearch(query, (res, status) => resolve(status === maps.services.Status.OK ? res.map(toPlace) : []), opt)
  })
}

/** 카테고리로 주변 검색. code: SW8 지하철역, CE7 카페, FD6 음식점 */
export async function searchCategory(code, center, radius, size = 15) {
  const maps = await loadMaps()
  const ps = new maps.services.Places()
  return new Promise((resolve) => {
    ps.categorySearch(
      code,
      (res, status) => resolve(status === maps.services.Status.OK ? res.map(toPlace) : []),
      { location: new maps.LatLng(center.lat, center.lng), radius, size, sort: maps.services.SortBy.DISTANCE },
    )
  })
}

/** 역 이름에서 노선 꼬리표 떼기: '홍대입구역 2호선' → '홍대입구역' */
const baseStation = (name) => name.replace(/\s+.*$/, '')

/** 중심점 근처 역 후보 3곳. 같은 역의 여러 노선은 하나로 합쳐요. 역이 없으면 빈 배열 */
export async function nearbyStations(center, radius = 3000) {
  const list = await searchCategory('SW8', center, radius, 15)
  const seen = new Set()
  const out = []
  for (const p of list) {
    const key = baseStation(p.name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...p, name: key, lines: [p.category] })
    if (out.length === 3) break
  }
  return out
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

// ----- 서버: 출발지 저장·조회 -----

/** 내 출발지 (좌표는 본인만 읽을 수 있어요). 없으면 null */
export async function fetchMyOrigin(pid) {
  if (!pid) return null
  const { data } = await supabase.from('origins').select('lat,lng,label,is_public').eq('participant_id', pid).maybeSingle()
  return data || null
}
export async function saveOrigin(mid, { lat, lng, label, isPublic }) {
  const { error } = await supabase.rpc('set_origin', { mid, p_lat: lat, p_lng: lng, p_label: label, p_public: isPublic })
  if (error) throw new Error('출발지를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
}
export async function setOriginPublic(mid, isPublic) {
  const { error } = await supabase.rpc('set_origin_public', { mid, p_public: isPublic })
  if (error) throw new Error('공개 설정을 바꾸지 못했어요.')
}
export async function clearOrigin(mid) {
  const { error } = await supabase.rpc('clear_origin', { mid })
  if (error) throw new Error('출발지를 지우지 못했어요.')
}
/** 출발지들의 중심점 { lat, lng, n }. 2명 미만이면 lat/lng는 null */
export async function fetchMidpoint(mid) {
  const { data, error } = await supabase.rpc('meeting_midpoint', { mid })
  if (error) throw new Error('중간 지점을 계산하지 못했어요.')
  const row = Array.isArray(data) ? data[0] : data
  return row || { lat: null, lng: null, n: 0 }
}
