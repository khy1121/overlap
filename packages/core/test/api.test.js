import { describe, expect, it } from 'vitest'
import { confirmedTime, deleteMeeting, fetchMyEntries, googleAddLink, hm, leaveMeeting, meetingSpan } from '../src/api/meetings.js'
import { myRequests, requestByCode, requestFriend, resultText } from '../src/api/friends.js'
import { fetchMyHabits } from '../src/api/habits.js'

/**
 * 가짜 Supabase 클라이언트: from(table)의 체인(select/eq/in/order/limit/delete)은 그대로 이어지고,
 * await하면 tables[table]에 넣어 둔 응답을 돌려줘요. rpc(name)는 rpcs[name] (함수면 호출 결과).
 * calls에 어떤 호출이 있었는지 남아요.
 */
function fakeDb({ tables = {}, rpcs = {} } = {}) {
  const calls = []
  const chain = (table) => {
    const q = { table, ops: [] }
    const b = {}
    for (const op of ['select', 'eq', 'in', 'order', 'limit', 'delete']) b[op] = (...args) => { q.ops.push([op, ...args]); return b }
    b.then = (ok, bad) => { calls.push(q); const r = tables[table]; return Promise.resolve(typeof r === 'function' ? r(q) : r).then(ok, bad) }
    return b
  }
  return {
    calls,
    from: (t) => chain(t),
    rpc: (name, args) => { calls.push({ rpc: name, args }); const r = rpcs[name]; return Promise.resolve(typeof r === 'function' ? r(args) : r) },
  }
}

describe('약속 조회·삭제', () => {
  it('내가 칠한 약속 id만 모아요 (빈 칸은 빼요)', async () => {
    const db = fakeDb({ tables: { participants: { data: [{ meeting_id: 'a', cells: { '0-1': 'y' } }, { meeting_id: 'b', cells: {} }], error: null } } })
    expect([...(await fetchMyEntries(db, 'u1'))]).toEqual(['a'])
    expect(db.calls[0].ops).toContainEqual(['eq', 'user_id', 'u1'])
  })
  it('불러오기 실패면 null', async () => {
    const db = fakeDb({ tables: { participants: { data: null, error: { message: 'x' } } } })
    expect(await fetchMyEntries(db, 'u1')).toBeNull()
  })
  it('삭제: 만든 사람이 아니라 지워진 게 없으면 알려 줘요', async () => {
    await expect(deleteMeeting(fakeDb({ tables: { meetings: { error: null, count: 0 } } }), 'm1')).rejects.toThrow('만든 사람만')
    await expect(deleteMeeting(fakeDb({ tables: { meetings: { error: null, count: 1 } } }), 'm1')).resolves.toBeUndefined()
  })
  it('나가기: 참여하지 않았으면 알려 줘요', async () => {
    await expect(leaveMeeting(fakeDb({ tables: { participants: { error: null, count: 0 } } }), 'm1', 'u1')).rejects.toThrow('참여하고 있지 않아요')
  })
})

describe('확정 시간 계산', () => {
  const m = { id: 'm1', title: '킥오프', start_date: '2026-11-23', days: 3, from_hour: 18, start_hour: null, picked: { d: 1, s: 2, dur: 2 } }
  it('확정 칸 → 실제 시각 (시간표 첫 행 기준)', () => {
    const t = confirmedTime(m)
    expect(t.start.getDate()).toBe(24)
    expect(hm(t.start)).toBe('19:00')
    expect(hm(t.end)).toBe('20:00')
    expect(t.open).toBe(false)
  })
  it('확정 전이거나 범위 밖이면 null', () => {
    expect(confirmedTime({ ...m, picked: null })).toBeNull()
    expect(confirmedTime({ ...m, picked: { d: 5, s: 0, dur: 2 } })).toBeNull()
  })
  it('조율 기간과 캘린더 링크', () => {
    const s = meetingSpan(m)
    expect([s.start.getDate(), s.end.getDate()]).toEqual([23, 25])
    const url = googleAddLink({ ...m, place: { name: '강남역', address: '서울' } }, confirmedTime(m), 'https://example.app')
    expect(url).toContain('calendar.google.com')
    expect(decodeURIComponent(url)).toContain('https://example.app/?m=m1')
    expect(new URL(url).searchParams.get('location')).toBe('강남역 · 서울')
  })
})

describe('친구 신청', () => {
  it('코드로 신청: 새 함수 결과를 그대로', async () => {
    const db = fakeDb({ rpcs: { request_friend_by_code: { data: [{ name: '서연', result: 'sent' }], error: null } } })
    expect(await requestByCode(db, 'ABCD1234')).toEqual({ name: '서연', result: 'sent' })
  })
  it('서버에 새 함수가 없으면 예전 방식(바로 친구)으로', async () => {
    const db = fakeDb({
      rpcs: {
        request_friend_by_code: { data: null, error: { code: 'PGRST202', message: 'Could not find the function' } },
        add_friend_by_code: { data: [{ name: '준호' }], error: null },
      },
    })
    expect(await requestByCode(db, 'X')).toEqual({ name: '준호', result: 'friends' })
  })
  it('알려진 오류는 사람이 읽는 문구로', async () => {
    const db = fakeDb({ rpcs: { request_friend: { data: null, error: { message: 'not met' } } } })
    await expect(requestFriend(db, 'u2')).rejects.toThrow('같은 약속에 참여한 사람')
  })
  it('신청 목록 실패면 빈 목록, 결과 문구', async () => {
    expect(await myRequests(fakeDb({ rpcs: { my_friend_requests: { data: null, error: { message: 'x' } } } }))).toEqual([])
    expect(resultText('sent', '서연')).toContain('서연님에게 친구 신청')
  })
})

describe('자주 되던 시간 불러오기', () => {
  it('지금 약속은 빼고, 요일·시각별로 나온 횟수와 가능 횟수를 모아요', async () => {
    // 두 약속 모두 2026-11-23(월) 하루, 18~19시 (칸 0·1 = 18:00·18:30 → 하루 48칸 중 36·37)
    const meeting = (id) => ({ id, start_date: '2026-11-23', days: 1, from_hour: 18, to_hour: 19, start_hour: null, end_hour: null })
    const db = fakeDb({
      tables: {
        participants: { data: [{ meeting_id: 'a', cells: { '0-0': 'y' } }, { meeting_id: 'b', cells: { '0-0': 'm', '0-1': 'y' } }, { meeting_id: 'now', cells: { '0-0': 'y' } }], error: null },
        meetings: { data: [meeting('a'), meeting('b')], error: null },
      },
    })
    const h = await fetchMyHabits(db, 'u1', 'now')
    expect(h.meetings).toBe(2)
    expect(h.seen[1][36]).toBe(2)
    expect(h.yes[1][36]).toBe(1.5) // 가능 1 + 조율 0.5
    expect(h.yes[1][37]).toBe(1)
  })
  it('칠한 지난 약속이 없으면 meetings 0', async () => {
    const db = fakeDb({ tables: { participants: { data: [], error: null } } })
    expect(await fetchMyHabits(db, 'u1', 'now')).toEqual({ meetings: 0 })
  })
})
