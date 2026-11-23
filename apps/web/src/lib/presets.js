// 새 약속 만들기와 약속 설정의 빠른 선택: 날짜 계산은 @overlap/core, 여기는 버튼 모양만
export { TIME_PRESETS, addDays, datePresets, daysBetween } from '@overlap/core/presets'

export const chip = (on) =>
  `inline-flex min-h-[40px] items-center gap-1 rounded-full border-0 px-4 text-sm font-semibold transition-colors ${on ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`

export const tile = (on) =>
  `flex min-h-[56px] flex-col items-center justify-center rounded-[14px] border-0 text-sm font-bold ${on ? 'bg-pen-strong text-pen-ink' : 'bg-rule2 text-ink hover:bg-rule'}`
