// 만날 장소 찾기: 카카오맵 JS SDK(services)로 좌표→동 이름, 키워드·카테고리 검색을 해요.
// 서버 없이 브라우저에서 돌고, 카카오 앱의 JavaScript 키와 Web 플랫폼 도메인에서만 동작해요.
// 카카오 개발자 콘솔에서 앱의 '카카오맵'을 켜 둬야 해요.
// 결과 모양·거리·링크·출발지 서버 호출은 @overlap/core (앱은 같은 결과를 서버 함수로 받아요)
import { KAKAO_JS_KEY } from './kakao'
import { supabase } from './supabase'
import * as placesCore from '@overlap/core/api/places'
import { regionText, toPlace, uniqueStations } from '@overlap/core/api/places'

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
      resolve(status === maps.services.Status.OK ? regionText(res) : '')
    })
  })
}

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

/** 중심점 근처 역 후보 3곳. 같은 역의 여러 노선은 하나로 합쳐요. 역이 없으면 빈 배열 */
export async function nearbyStations(center, radius = 3000) {
  return uniqueStations(await searchCategory('SW8', center, radius, 15))
}

// ----- 거리·링크, 출발지·중간 지점: @overlap/core (앱과 같아요) -----
export { distanceM, kakaoToLink, kmText } from '@overlap/core/api/places'
export const fetchMyOrigin = (pid) => placesCore.fetchMyOrigin(supabase, pid)
export const saveOrigin = (mid, v) => placesCore.saveOrigin(supabase, mid, v)
export const setOriginPublic = (mid, isPublic) => placesCore.setOriginPublic(supabase, mid, isPublic)
export const clearOrigin = (mid) => placesCore.clearOrigin(supabase, mid)
export const fetchMidpoint = (mid) => placesCore.fetchMidpoint(supabase, mid)
