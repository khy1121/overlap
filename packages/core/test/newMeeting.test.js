import { describe, expect, it } from 'vitest'
import { createArgs, createMeeting, newMeetingPlan } from '../src/newMeeting.js'

const base = { title: ' 스터디 ', start: '2026-11-30', end: '2026-12-06', from: 9, to: 22, split: false, startHour: 12, endHour: 18, dur: 2, count: 4 }

describe('새 약속 만들기', () => {
  it('여러 날: 시간대가 곧 첫날·마지막 날 시각 (따로 정하기 꺼짐)', () => {
    expect(createArgs(base)).toEqual({ p_title: '스터디', p_start: '2026-11-30', p_from: 9, p_to: 22, p_dur: 2, p_expected: 4, p_days: 7, p_start_hour: 9, p_end_hour: 22 })
  })
  it('따로 정하기: 첫날 시작·마지막 날 끝만 바뀌어요', () => {
    const a = createArgs({ ...base, split: true })
    expect([a.p_from, a.p_to, a.p_start_hour, a.p_end_hour]).toEqual([9, 22, 12, 18])
  })
  it('하루짜리는 따로 정하기를 무시하고, 인원은 1~50', () => {
    const a = createArgs({ ...base, end: base.start, split: true, count: 99 })
    expect([a.p_days, a.p_from, a.p_to, a.p_start_hour, a.p_expected]).toEqual([1, 9, 22, 9, 50])
  })
  it('기간이 거꾸로면 오류', () => {
    expect(newMeetingPlan({ ...base, end: '2026-11-29' }).err).toBeTruthy()
    expect(newMeetingPlan(base).err).toBeNull()
  })
  it('만들고 친구 초대: 실패 수를 세요', async () => {
    const db = { rpc: async (name, args) => (name === 'create_meeting' ? { data: 'm1' } : { error: args.target === 'b' ? { message: 'x' } : null }) }
    expect(await createMeeting(db, base, ['a', 'b'])).toEqual({ mid: 'm1', invited: 1, failed: 1 })
  })
  it('오류 문구: 권한 문제와 낡은 서버를 구분해요', async () => {
    const fail = (error) => ({ rpc: async () => ({ error }) })
    await expect(createMeeting(fail({ code: '42501', message: 'permission denied for function create_meeting' }), base)).rejects.toThrow('로그인이 풀렸어요')
    await expect(createMeeting(fail({ message: 'Could not find the function create_meeting(p_days)' }), base)).rejects.toThrow('서버 업데이트')
  })
})
