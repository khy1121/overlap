import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useToast } from '../hooks/useToast'
import PageHeader from './PageHeader'

const KIND = { bug: { label: '🐞 버그', tone: 'bg-no-soft' }, idea: { label: '💡 아이디어', tone: 'bg-maybe-soft' }, etc: { label: '💬 기타', tone: 'bg-rule2' } }
const STATUS = { new: '새 의견', checked: '확인함', done: '처리 완료' }
const FILTERS = [['new', '새 의견'], ['checked', '확인함'], ['done', '처리 완료'], [null, '전체']]

const kst = (iso) =>
  new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })

/** 브라우저 정보에서 기기·브라우저만 짧게 */
function device(ua = '') {
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : '기타'
  const br = /KAKAOTALK/i.test(ua) ? '카카오톡' : /SamsungBrowser/.test(ua) ? '삼성 인터넷' : /Edg\//.test(ua) ? 'Edge' : /CriOS|Chrome/.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : /Firefox/.test(ua) ? 'Firefox' : '기타'
  return `${os} · ${br}`
}

/** 관리자 의견함 (/?page=inbox). 관리자가 아니면 서버가 거절해요 */
export default function Inbox() {
  const toast = useToast()
  const [filter, setFilter] = useState('new')
  const [rows, setRows] = useState(null)
  const [counts, setCounts] = useState({})
  const [denied, setDenied] = useState(false)
  const [open, setOpen] = useState(null)

  const load = useCallback(async () => {
    const [list, cnt] = await Promise.all([
      supabase.rpc('admin_feedback_list', { p_status: filter, p_limit: 200 }),
      supabase.rpc('admin_feedback_counts'),
    ])
    if (list.error) {
      if (/admin only/.test(list.error.message)) setDenied(true)
      else toast(/function/i.test(list.error.message) ? '의견함이 아직 서버에 준비되지 않았어요.' : '의견을 불러오지 못했어요.')
      setRows([])
      return
    }
    setRows(list.data)
    setCounts(Object.fromEntries((cnt.data || []).map((c) => [c.status, Number(c.n)])))
  }, [filter, toast])
  useEffect(() => { load() }, [load])

  async function setStatus(f, status) {
    const { error } = await supabase.rpc('admin_set_feedback_status', { p_id: f.id, p_status: status })
    if (error) return toast('상태를 바꾸지 못했어요.')
    toast(`'${STATUS[status]}'(으)로 바꿨어요`)
    load()
  }

  if (denied) {
    return (
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        <PageHeader title="의견함" />
        <p className="sheet m-0 text-[15px] text-ink2">관리자만 볼 수 있어요.</p>
      </div>
    )
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
      <PageHeader title="의견함" sub="사용자가 보낸 버그 신고와 개선 아이디어예요. 관리자에게만 보여요." />

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="상태">
        {FILTERS.map(([key, label]) => {
          const n = key ? counts[key] || 0 : total
          return (
            <button
              key={label}
              role="tab"
              aria-selected={filter === key}
              onClick={() => { setFilter(key); setOpen(null) }}
              className={`min-h-[38px] rounded-full border-0 px-3.5 text-[14px] font-semibold ${filter === key ? 'bg-ink text-sheet' : 'bg-sheet text-ink2 shadow-soft hover:text-ink'}`}
            >
              {label} <span className="tabular opacity-70">{n}</span>
            </button>
          )
        })}
      </div>

      <section className="flex flex-col gap-2.5">
        {rows === null && <p className="sheet m-0 text-[13px] text-ink2">불러오는 중…</p>}
        {rows?.length === 0 && <p className="sheet m-0 text-[14px] text-ink2">{filter === 'new' ? '새 의견이 없어요. 🎉' : '의견이 없어요.'}</p>}
        {rows?.map((f) => {
          const k = KIND[f.kind] || KIND.etc
          const expanded = open === f.id
          return (
            <article key={f.id} className="sheet flex flex-col gap-2.5 !p-4">
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className={`rounded-full px-2.5 py-0.5 font-semibold text-ink ${k.tone}`}>{k.label}</span>
                <span className="font-semibold">{f.anonymous ? '익명' : f.sender}</span>
                <span className="text-ink2">{kst(f.created_at)}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[12px] font-semibold ${f.status === 'new' ? 'bg-pen-soft text-accent' : 'bg-rule2 text-ink2'}`}>{STATUS[f.status]}</span>
              </div>
              <p className="m-0 whitespace-pre-wrap break-words text-[15px] leading-relaxed">{f.message}</p>

              <button className="self-start border-0 bg-transparent p-0 text-[12px] text-ink2 underline underline-offset-2" onClick={() => setOpen(expanded ? null : f.id)}>
                {expanded ? '자세한 정보 접기' : `자세한 정보 · ${device(f.user_agent)}`}
              </button>
              {expanded && (
                <dl className="m-0 grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-[12px] bg-rule2 px-3 py-2.5 text-[12px]">
                  <dt className="text-ink2">보낸 화면</dt><dd className="m-0 break-all">{f.page || '-'}</dd>
                  <dt className="text-ink2">앱 버전</dt><dd className="m-0 break-all">{f.app_version || '-'}</dd>
                  <dt className="text-ink2">기기</dt><dd className="m-0 break-all">{f.user_agent || '-'}</dd>
                </dl>
              )}

              <div className="flex flex-wrap gap-1.5">
                {f.status !== 'checked' && <button className="btn-soft btn-sm" onClick={() => setStatus(f, 'checked')}>확인함</button>}
                {f.status !== 'done' && <button className="btn btn-sm" onClick={() => setStatus(f, 'done')}>처리 완료</button>}
                {f.status !== 'new' && <button className="btn-ghost btn-sm" onClick={() => setStatus(f, 'new')}>새 의견으로</button>}
              </div>
            </article>
          )
        })}
      </section>
    </div>
  )
}
