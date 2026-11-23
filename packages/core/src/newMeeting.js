// 새 약속 만들기 (웹·앱 공통): 폼 → 계산용 cfg · 오류 · 서버 인자, 그리고 만들기 + 친구 초대
import { daysBetween } from './presets.js'
import { rangeError } from './schedule.js'

/**
 * form = { title, start, end, from, to, split, startHour, endHour, dur, count }
 * split(첫날 시작·마지막 날 끝을 따로)은 하루짜리면 무시해요.
 * 결과: { days, one, split, cfg(schedule 계산용), err(문구 또는 null) }
 */
export function newMeetingPlan(form) {
  const days = form.start && form.end ? daysBetween(form.start, form.end) : 0
  const one = days === 1
  const split = Boolean(form.split) && !one
  const from = Number(form.from)
  const to = Number(form.to)
  const cfg = {
    start: form.start,
    days,
    from,
    to,
    startHour: split ? Number(form.startHour) : from,
    endHour: split ? Number(form.endHour) : to,
    dur: form.dur,
  }
  const err = days >= 1 ? rangeError(cfg) : '날짜를 확인해 주세요'
  return { days, one, split, cfg, err }
}

/** create_meeting 함수에 넘기는 인자 */
export function createArgs(form) {
  const { days, one, cfg } = newMeetingPlan(form)
  return {
    p_title: form.title.trim(),
    p_start: form.start,
    p_from: one ? cfg.startHour : cfg.from,
    p_to: one ? cfg.endHour : cfg.to,
    p_dur: form.dur,
    p_expected: Math.max(1, Math.min(50, Number(form.count) || 4)),
    p_days: days,
    p_start_hour: cfg.startHour,
    p_end_hour: cfg.endHour,
  }
}

/** 약속을 만들고 고른 친구를 바로 초대해요. 결과 { mid, invited, failed } (실패하면 문구로 throw) */
export async function createMeeting(db, form, friendIds = []) {
  const { data: mid, error } = await db.rpc('create_meeting', createArgs(form))
  if (error) {
    // 권한·로그인 문제를 먼저 (메시지에 'function'이 들어가도 서버가 낡은 게 아니에요)
    if (/permission denied|jwt|not authenticated|42501/i.test(`${error.code || ''} ${error.message}`)) throw new Error('로그인이 풀렸어요. 다시 로그인한 뒤 만들어 주세요.')
    const outdated = /function|p_days|dur_check|null value/i.test(error.message)
    throw new Error(outdated ? '서버 업데이트가 아직이라 이 설정(기간·만나는 시간)으로는 만들 수 없어요.' : `약속을 만들지 못했어요: ${error.message}`)
  }
  const results = await Promise.all(friendIds.map((target) => db.rpc('invite_friend', { mid, target })))
  const failed = results.filter((r) => r.error).length
  return { mid, invited: friendIds.length - failed, failed }
}
