import { useState } from 'react'
import { CloudSun, RefreshCw, TrendingDown, TrendingUp, Trophy } from 'lucide-react'
import { Screen } from '@/components/common/layout'
import { Card, H2, Pill } from '@/components/common/ui'
import { SkeletonCard, Spinner } from '@/components/ui/loading'
import { useMenuAnalysis } from '@/features/menu/queries'
import { dayOffset, GROUPS, numberOfDays, shortDate } from '@/features/menu/menuLogic'
import { demoPeriod } from '@/features/menu/mock'
import { won } from '@/lib/format'
import MenuTabs from '@/features/menu/components/MenuTabs'
import MenuViewControl from '@/features/menu/components/MenuViewControl'
import { MenuSelect, MenuTextField } from '@/features/menu/components/MenuFields'

const WEATHER = [{ value: 'ALL', label: '전체' }, { value: 'SUN', label: '맑음' }, { value: 'RAIN', label: '비' }, { value: 'SNOW', label: '눈' }, { value: 'CLOUD', label: '흐림' }]

function Change({ value }) {
  return <span className={'num text-caption font-bold ' + (value === null ? 'text-ink-mute' : value >= 0 ? 'text-woori-deep' : 'text-danger')}>{value === null ? '비교 자료 없음' : (value >= 0 ? '+' : '') + value.toFixed(1) + '%'}</span>
}

export default function MenuAnalysisPage() {
  const [group, setGroup] = useState('ALL')
  const [weather, setWeather] = useState('ALL')
  const [period, setPeriod] = useState('7')
  const [range, setRange] = useState(demoPeriod)
  const [draft, setDraft] = useState(demoPeriod)
  const [periodError, setPeriodError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const query = useMenuAnalysis({ ...range, group, weather })
  const data = query.data
  const ranked = data?.ranking.filter((row) => row.quantity !== null) ?? []
  const maxQuantity = Math.max(...ranked.map((row) => row.quantity), 1)
  const selectPeriod = (value) => {
    setPeriod(value); setExpanded(false); setPeriodError('')
    if (value !== 'custom') {
      const next = { from: dayOffset(demoPeriod.to, 1 - Number(value)), to: demoPeriod.to }
      setRange(next); setDraft(next)
    }
  }
  const applyRange = () => {
    if (!draft.from || !draft.to || draft.from > draft.to || numberOfDays(draft.from, draft.to) > 366) { setPeriodError('시작일과 종료일을 1~366일 범위로 선택해 주세요.'); return }
    setRange({ ...draft }); setPeriodError(''); setExpanded(false)
  }
  const weatherRows = data?.ranking.filter((row) => row.weatherAverage !== null).toSorted((a, b) => b.weatherAverage - a.weatherAverage).slice(0, 5) ?? []
  const weatherMax = Math.max(...weatherRows.map((row) => row.weatherAverage), 1)

  return (
    <Screen title="메뉴" back={false} tab wide compact>
      <MenuTabs />
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h2 className="text-h2 font-bold text-ink">판매 분석</h2><span className="rounded-md bg-surface-muted px-2 py-1 text-caption font-bold text-ink-sub">시연 데이터</span></div><p className="mt-1 text-label text-ink-sub">잘 팔리는 메뉴와 개선이 필요한 메뉴를 비교해요.</p></div><button type="button" disabled={query.isFetching} onClick={() => query.refetch()} className="inline-flex min-h-11 items-center gap-2 rounded-input border border-line px-3 text-label font-bold text-woori-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue">{query.isFetching ? <Spinner size={15} label="판매 자료 재조회 중" /> : <RefreshCw size={15} aria-hidden="true" />}새로고침</button></div>
      <Card tone="line" gap="gap-4" pad="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="w-full max-w-xs"><MenuViewControl label="판매 분석 분류" value={group} onChange={(value) => { setGroup(value); setExpanded(false) }} items={GROUPS} /></div><div className="w-full sm:w-48"><MenuSelect label="분석 기간" value={period} onChange={(event) => selectPeriod(event.target.value)}><option value="7">최근 7일</option><option value="14">최근 14일</option><option value="30">최근 30일</option><option value="custom">기간 직접 지정</option></MenuSelect></div></div>
        {period === 'custom' && <div className="flex flex-wrap items-end gap-3"><MenuTextField label="분석 시작일" type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} /><MenuTextField label="분석 종료일" type="date" value={draft.to} onChange={(event) => setDraft({ ...draft, to: event.target.value })} /><button type="button" onClick={applyRange} className="h-11 rounded-input bg-woori-deep px-4 text-label font-bold text-white">기간 적용</button></div>}
        {periodError && <p role="alert" className="text-caption text-danger">{periodError}</p>}
        <p className="text-caption text-ink-sub">분석 {shortDate(range.from)}–{shortDate(range.to)}{data ? ' · 비교 ' + shortDate(data.previousFrom) + '–' + shortDate(data.previousTo) : ''} · 시연 자료 수집 2026.10.1–11.24</p>
      </Card>
      {query.error ? <Card tone="warn"><p role="alert" className="text-label text-danger">{query.error.message}</p><button type="button" onClick={() => query.refetch()} className="min-h-11 rounded-input border border-line bg-white px-4 text-label font-bold text-woori-deep">다시 불러오기</button></Card> : query.isPending ? <SkeletonCard lines={7} /> : <div aria-busy={query.isFetching} className="flex min-w-0 flex-col gap-4">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[['선택 분류 매출', ranked.length ? won(ranked.reduce((sum, row) => sum + row.revenue, 0)) + '원' : '자료 없음'], ['판매 수량', ranked.length ? won(ranked.reduce((sum, row) => sum + row.quantity, 0)) + '개' : '자료 없음'], ['판매 1위', ranked[0]?.menu.name ?? '자료 없음']].map(([label, value], index) => <div key={label} className={`min-w-0 rounded-card p-4 ${index === 2 ? 'col-span-2 sm:col-span-1' : ''} ${index === 0 ? 'bg-hero text-white' : 'border border-line bg-white'}`}><dt className={`text-caption ${index === 0 ? 'text-[#d9ebfa]' : 'text-ink-sub'}`}>{label}</dt><dd className={`num mt-2 text-[18px] font-bold sm:text-xl ${index === 0 ? 'text-white' : 'text-ink'}`}>{value}</dd></div>)}
        </dl>
        <Card tone="line" gap="gap-4" pad="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><H2><span className="flex items-center gap-2"><Trophy size={19} className="text-woori-blue" aria-hidden="true" />판매 TOP 10</span></H2><Pill tone="gray">수집된 {data.allDays}일 기준</Pill></div>
          <div className="hidden grid-cols-[2rem_minmax(0,2fr)_1fr_1.2fr_1fr] gap-3 border-b border-line pb-2 text-caption text-ink-sub md:grid"><span>순위</span><span>메뉴명 · POS 코드</span><span className="text-right">판매 수량</span><span className="text-right">매출액</span><span className="text-right">이전 기간 대비</span></div>
          <ol className="divide-y divide-line">{data.ranking.slice(0, expanded ? undefined : 10).map((row) => <li key={row.menu.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 md:grid-cols-[2rem_minmax(0,2fr)_1fr_1.2fr_1fr]">
            <span className={'flex size-7 items-center justify-center rounded-lg text-caption font-bold ' + (row.rank === 1 ? 'bg-woori-deep text-white' : 'bg-surface-muted text-ink-sub')}>{row.rank ?? '—'}</span>
            <div className="min-w-0"><p className="text-label font-bold text-ink">{row.menu.name}</p><p className="mt-1 text-caption text-ink-sub">{row.menu.posCode ?? 'POS 미연결'}{row.menu.deletedAt ? ' · 삭제된 메뉴의 과거 판매' : row.quantity === null ? ' · 집계 자료 없음' : ''}</p>{row.quantity !== null && <div aria-hidden="true" className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-woori-blue" style={{ width: `${row.quantity / maxQuantity * 100}%` }} /></div>}</div>
            <strong className="num text-right text-label text-woori-deep">{row.quantity === null ? '—' : won(row.quantity) + '개'}</strong>
            <p className="num col-start-2 text-caption text-ink-sub md:col-start-auto md:text-right md:text-label md:text-ink">{row.revenue === null ? row.excludedReason : won(row.revenue) + '원'}</p><div className="text-right"><Change value={row.change} /></div>
          </li>)}</ol>
          {data.ranking.length > 10 && <button type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)} className="min-h-11 rounded-input bg-surface-muted text-label font-bold text-woori-deep">{expanded ? 'TOP 10만 보기' : '더보기 · 전체 ' + data.ranking.length + '개 메뉴 확인'}</button>}
          {!data.ranking.some((row) => row.quantity !== null) && <p role="status" className="py-4 text-center text-label text-ink-sub">선택한 기간의 판매 데이터가 부족합니다.</p>}
        </Card>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Card gap="gap-4" pad="p-4 sm:p-5"><H2><span className="flex items-center gap-2"><TrendingUp size={18} className="text-woori-blue" aria-hidden="true" />인기 메뉴</span></H2>{data.popular.map((row) => <div key={row.menu.id} className="rounded-input bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-label text-ink">{row.menu.name}</strong><Change value={row.change} /></div><p className="mt-2 text-caption text-ink-sub">판매 {won(row.quantity)}개 · 매출 기여 {row.contribution.toFixed(1)}% · 판매량 {row.rank}위</p></div>)}{!data.popular.length && <p className="text-caption text-ink-sub">비교 가능한 판매 자료가 부족합니다.</p>}</Card>
          <Card tone="amber" gap="gap-4" pad="p-4 sm:p-5"><H2><span className="flex items-center gap-2"><TrendingDown size={18} className="text-warning" aria-hidden="true" />부진·개선 검토 메뉴</span></H2>{data.poor.map((row) => <div key={row.menu.id} className="rounded-input bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-label text-ink">{row.menu.name}</strong><Change value={row.change} /></div><p className="mt-2 text-caption text-ink-sub">판매 {won(row.quantity)}개 · 비교 기간 {won(row.previousQuantity)}개 · 개선 검토</p></div>)}{!data.poor.length && <p className="text-caption text-ink-sub">판매 감소를 판단할 충분한 자료가 없거나 현재 감소 메뉴가 없어요.</p>}<p className="text-caption text-ink-sub">판매중지·시즌 외 메뉴, 출시 후 14일 미만 메뉴와 비교 자료가 부족한 메뉴는 부진 판단에서 제외해요.</p></Card>
        </div>
        <Card tone="line" gap="gap-5" pad="p-4 sm:p-6">
          <div><H2><span className="flex items-center gap-2"><CloudSun size={19} className="text-woori-blue" aria-hidden="true" />날씨별 판매 분석</span></H2><p className="mt-1 text-caption text-ink-sub">같은 분석 기간 안에서 날씨별 하루 평균 판매 수량을 비교해요.</p></div>
          <div className="max-w-xl"><MenuViewControl label="판매 분석 날씨" value={weather} onChange={setWeather} items={WEATHER} /></div>
          {!data.weatherEnough || !weatherRows.length ? <p role="status" className="rounded-input bg-surface-muted p-8 text-center text-label text-ink-sub">데이터가 부족합니다. 해당 날씨는 {data.weatherDays}일 수집됐어요. 최소 3일 이상의 자료가 필요해요.</p> : <>
            <p className="text-caption text-ink-sub">{WEATHER.find((entry) => entry.value === weather).label} · {data.weatherDays}일 기준 · 전체 평균은 같은 기간의 모든 날씨 기준</p>
            <ol className="flex flex-col gap-4">{weatherRows.map((row, index) => <li key={row.menu.id} className="flex flex-col gap-2"><div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-label text-ink">{index + 1}. {row.menu.name}</strong><span className="num text-caption text-woori-deep">총 {won(row.weatherQuantity)}개 · 평균 {won(Math.round(row.weatherAverage * 10) / 10)}개/일</span></div><div className="flex items-center gap-3"><div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-woori-blue" style={{ width: row.weatherAverage / weatherMax * 100 + '%' }} /></div><span className="w-24 shrink-0 text-right text-caption text-ink-sub">{weather === 'ALL' ? '전체 평균 기준' : <Change value={row.weatherChange} />}</span></div></li>)}</ol>
          </>}
          <p className="border-t border-line pt-3 text-caption text-ink-sub">날씨와 판매가 함께 변한 관측 결과예요. 날씨만의 효과로 단정하지 않아요. 현재 표본은 시연용이며 실제 기상 API 조회 결과가 아니에요.</p>
        </Card>
      </div>}
    </Screen>
  )
}
