import { describe, expect, it } from 'vitest'
import { distanceM, kakaoToLink, kmText, regionText, searchKeyword, toMeetingPlace, toPlace, uniqueStations } from '../src/api/places.js'

const raw = { id: '1', place_name: '스타벅스 한성대점', road_address_name: '서울 성북구 삼선교로', category_name: '음식점 > 카페 > 스타벅스', x: '127.01', y: '37.58', place_url: 'http://place.map.kakao.com/1', distance: '120' }

describe('장소', () => {
  it('카카오 결과 → 장소 → 약속 장소', () => {
    const p = toPlace(raw)
    expect(p).toMatchObject({ id: '1', name: '스타벅스 한성대점', category: '스타벅스', lat: 37.58, lng: 127.01, distance: 120 })
    expect(toMeetingPlace(p, '한성대입구역')).toEqual({ name: '스타벅스 한성대점', address: '서울 성북구 삼선교로', lat: 37.58, lng: 127.01, kakao_id: '1', url: 'http://place.map.kakao.com/1', station: '한성대입구역' })
  })
  it('같은 역 여러 노선은 하나로', () => {
    const list = ['홍대입구역 2호선', '홍대입구역 공항철도', '합정역 6호선'].map((name) => ({ name, category: name.split(' ')[1] }))
    expect(uniqueStations(list).map((s) => s.name)).toEqual(['홍대입구역', '합정역'])
  })
  it('행정동 이름·거리·링크', () => {
    expect(regionText([{ region_type: 'B', region_2depth_name: 'x' }, { region_type: 'H', region_2depth_name: '성북구', region_3depth_name: '삼선동' }])).toBe('성북구 삼선동')
    expect(regionText([])).toBe('')
    expect(Math.round(distanceM({ lat: 37.5, lng: 127 }, { lat: 37.51, lng: 127 }))).toBe(1112)
    expect(kmText(950)).toBe('950m')
    expect(kmText(1530)).toBe('1.5km')
    expect(kakaoToLink({ name: '합정역', lat: 37.5, lng: 126.9 })).toBe('https://map.kakao.com/link/to/%ED%95%A9%EC%A0%95%EC%97%AD,37.5,126.9')
  })
  it('앱 검색: 서버 함수 결과를 같은 모양으로, 미준비면 안내', async () => {
    const ok = { functions: { invoke: async (_n, { body }) => ({ data: { documents: body.op === 'keyword' ? [raw] : [] } }) } }
    expect((await searchKeyword(ok, '스타벅스'))[0].name).toBe('스타벅스 한성대점')
    const missing = { functions: { invoke: async () => ({ error: { context: { status: 500, json: async () => ({ error: 'not_configured' }) } } }) } }
    await expect(searchKeyword(missing, 'x')).rejects.toThrow('아직 서버에 준비되지')
  })
})
