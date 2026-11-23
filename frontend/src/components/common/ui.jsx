import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Cloud, CloudRain, Sun } from 'lucide-react'

// 클래스 합치기 — text-h2 · text-label 같은 커스텀 크기 토큰을 tailwind-merge(cn)가
// 글자색과 같은 그룹으로 보고 지워버려서, 여기서는 단순히 이어 붙인다
const cx = (...a) => a.filter(Boolean).join(' ')

const TEXT = {
  blue: 'text-woori-blue',
  deep: 'text-woori-deep',
  ink: 'text-ink',
  sub: 'text-ink-sub',
  mute: 'text-ink-mute',
  ok: 'text-success',
  warn: 'text-danger',
  amber: 'text-warning',
  white: 'text-white',
}

/* ---------- 글자 ---------- */
export const Eyebrow = ({ children, tone = 'blue' }) => (
  <p className={cx('text-eyebrow font-bold', TEXT[tone])}>{children}</p>
)
export const H1 = ({ children }) => <h2 className="whitespace-pre-line text-h1 font-bold text-ink">{children}</h2>
export const H2 = ({ children, className }) => (
  <h3 className={cx('whitespace-pre-line text-h2 font-bold text-ink', className)}>{children}</h3>
)
export const P = ({ children, tone = 'sub', small = false }) => (
  <p className={cx('whitespace-pre-line', small ? 'text-caption' : 'text-label', TEXT[tone])}>{children}</p>
)
export const Label = ({ children }) => <p className="text-[13px] font-medium text-ink-sub">{children}</p>

/* ---------- 카드 ---------- */
const CARD = {
  tint: 'bg-woori-tint',
  line: 'bg-white border border-line',
  warn: 'bg-danger-bg',
  ok: 'bg-success-bg',
  amber: 'bg-warning-bg',
}
/** 카드 — tone: tint(연한 파랑) | line(흰 바탕+선) | warn | ok | amber */
export function Card({ tone = 'tint', gap = 'gap-2.5', pad = 'p-[18px]', to, onClick, className, children }) {
  const cls = cx('flex flex-col rounded-card', CARD[tone], gap, pad, className)
  if (to)
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cx(cls, 'text-left')}>
        {children}
      </button>
    )
  return <section className={cls}>{children}</section>
}

/** 매출 카드 같은 파란 그라데이션 카드 */
export const Hero = ({ children }) => (
  <section className="bg-hero flex flex-col gap-1.5 rounded-hero p-5">{children}</section>
)
export const HeroLabel = ({ children }) => <p className="text-[13px] font-medium text-[#d9ebfa]">{children}</p>
export const HeroValue = ({ children, size = 'text-display' }) => (
  <p className={cx('num font-bold text-white', size)}>{children}</p>
)

/** 카드 제목 줄 (제목 + 오른쪽 요소) */
export const HeadRow = ({ title, size = 'text-h2', children }) => (
  <div className="flex items-center gap-2">
    <h3 className={cx('font-bold text-ink', size)}>{title}</h3>
    <div className="ml-auto flex items-center gap-1.5">{children}</div>
  </div>
)

/** 섹션 제목 + 오른쪽 링크 (예: '최근 실행 결과  더 보기 ›') */
export const SectionHead = ({ title, action, to }) => (
  <div className="flex items-center">
    <h3 className="text-h2 font-bold text-ink">{title}</h3>
    {action && (
      <Link to={to} className="ml-auto text-[15px] font-bold text-woori-blue">
        {action}
      </Link>
    )}
  </div>
)

/* ---------- 정보 행 ---------- */
/** 라벨 ─── 값 */
export const KV = ({ label, value, tone = 'ink' }) => (
  <div className="flex items-center gap-2">
    <span className="text-label text-ink-sub">{label}</span>
    <span className={cx('num ml-auto text-right text-body font-bold', TEXT[tone])}>{value}</span>
  </div>
)
/** 제목+보조설명 ─── 값 */
export const KV2 = ({ title, sub, value, tone = 'ink' }) => (
  <div className="flex items-center gap-2">
    <div className="flex flex-col">
      <span className="text-body font-medium text-ink">{title}</span>
      <span className="text-caption text-ink-mute">{sub}</span>
    </div>
    <span className={cx('num ml-auto text-body font-bold', TEXT[tone])}>{value}</span>
  </div>
)
/** 리스트 행 — Figma 'HF/ListRow' (제목 ─── 파란 값 ›) */
export function ListRow({ title, value, to, onClick }) {
  const inner = (
    <>
      <span className="text-body text-ink-sub">{title}</span>
      <span className="num ml-auto text-body font-bold text-woori-blue">{value}</span>
      <ChevronRight size={16} strokeWidth={2.4} className="shrink-0 text-woori-blue" />
    </>
  )
  const cls = 'flex h-[54px] w-full items-center gap-1.5 text-left'
  if (to)
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    )
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  )
}
export const Divider = () => <hr className="border-line" />

/* ---------- 버튼 ---------- */
const BTN = {
  primary: 'bg-woori-deep text-white',
  secondary: 'bg-woori-tint text-woori-deep',
  outline: 'bg-white border border-line text-ink',
  text: 'h-9 bg-transparent px-0 text-woori-blue',
}
/** 버튼 — Figma 'HF/Button' (Primary | Secondary | Outline | Text) */
export function Button({ variant = 'primary', to, onClick, full = true, className, children, type = 'button' }) {
  const cls = cx(
    'inline-flex h-[52px] items-center justify-center rounded-button px-4 text-base font-bold transition active:scale-[.98]',
    BTN[variant],
    full && variant !== 'text' && 'w-full',
    className,
  )
  if (to)
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    )
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  )
}
export const ButtonRow = ({ children }) => <div className="flex gap-2 [&>*]:flex-1">{children}</div>

/* ---------- 입력 ---------- */
export function Field({ label, placeholder, defaultValue, right, value, onChange, maxLength, highlight }) {
  return (
    <label className="flex flex-col gap-2">
      {label && <Label>{label}</Label>}
      <div className="flex gap-2">
        <input
          className={cx(
            'h-[52px] w-full min-w-0 rounded-input bg-surface-muted px-4 text-body font-medium text-ink outline-none placeholder:font-normal placeholder:text-ink-mute focus:ring-2 focus:ring-woori-blue',
            highlight && 'ring-[1.5px] ring-woori-deep',
          )}
          placeholder={placeholder}
          defaultValue={defaultValue}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
        />
        {right}
      </div>
    </label>
  )
}

/** 칩 그룹 — 선택값을 내부 state로 관리. links를 주면 누를 때 이동 */
export function Chips({ items, defaultIndex = 0, onChange, equal = false, links }) {
  const [active, setActive] = useState(defaultIndex)
  return (
    <div
      className={equal ? `grid gap-1.5` : 'flex flex-wrap gap-2'}
      style={equal ? { gridTemplateColumns: `repeat(${items.length}, 1fr)` } : undefined}
    >
      {items.map((label, i) => {
        const on = i === active
        const cls = cx(
          'rounded-chip py-2 text-[13px] text-center',
          equal ? 'px-2' : 'px-3.5',
          on ? 'bg-woori-deep font-bold text-white' : 'bg-surface-muted font-medium text-ink-sub',
        )
        if (links?.[i])
          return (
            <Link key={label} to={links[i]} className={cls}>
              {label}
            </Link>
          )
        return (
          <button
            key={label}
            type="button"
            className={cls}
            onClick={() => {
              setActive(i)
              onChange?.(i)
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/** 세그먼트 — 매출 | 입출금 */
export const Segmented = ({ items, active, links }) => (
  <div className="flex gap-1 rounded-input bg-surface-muted p-1">
    {items.map((label, i) => (
      <Link
        key={label}
        to={links[i]}
        className={cx(
          'flex-1 rounded-[9px] py-[9px] text-center text-label',
          i === active ? 'bg-white font-bold text-woori-deep' : 'font-medium text-ink-sub',
        )}
      >
        {label}
      </Link>
    ))}
  </div>
)

const PILL = {
  blue: 'bg-woori-tint text-woori-blue',
  deep: 'bg-white text-woori-deep',
  ok: 'bg-success-bg text-success',
  warn: 'bg-danger-bg text-danger',
  amber: 'bg-warning-bg text-warning',
  gray: 'bg-surface-muted text-ink-sub',
  okWhite: 'bg-white text-success',
  warnWhite: 'bg-white text-danger',
  amberWhite: 'bg-white text-warning',
}
/** 상태 알약 (연결됨 · 확인 필요 · 실패 …) */
export const Pill = ({ tone = 'blue', children }) => <span className={cx('pill', PILL[tone])}>{children}</span>
export const Pills = ({ items, tone = 'deep' }) => (
  <div className="flex flex-wrap gap-1.5">
    {items.map((t) => (
      <Pill key={t} tone={tone}>
        {t}
      </Pill>
    ))}
  </div>
)

export function Toggle({ label, desc, defaultChecked = true }) {
  const [on, setOn] = useState(defaultChecked)
  return (
    <div className="flex items-center gap-2 py-2.5">
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-body font-medium text-ink">{label}</span>
        {desc && <span className="text-[13px] text-ink-sub">{desc}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn(!on)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition', on ? 'bg-woori-deep' : 'bg-line')}
      >
        <span
          className={cx(
            'absolute top-[3px] size-[22px] rounded-full bg-white transition-all',
            on ? 'left-[23px]' : 'left-[3px]',
          )}
        />
      </button>
    </div>
  )
}

/** 진행 단계 표시 — failAt 단계는 빨간색 */
export const Stepper = ({ steps, current, failAt = -1 }) => (
  <div className="flex gap-1">
    {steps.map((s, i) => {
      const done = i <= current
      const fail = i === failAt
      return (
        <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
          <span
            className={cx(
              'rounded-full',
              done ? 'size-3.5' : 'size-2.5',
              fail ? 'bg-danger' : done ? 'bg-woori-deep' : 'bg-line',
            )}
          />
          <span
            className={cx(
              'text-[11px]',
              i === current && 'font-bold',
              fail ? 'text-danger' : done ? 'text-woori-deep' : 'text-ink-mute',
            )}
          >
            {s}
          </span>
        </div>
      )
    })}
  </div>
)

/** 간단 막대그래프 */
export const BarChart = ({ values, highlight = -1, labels, height = 100 }) => {
  const max = Math.max(...values)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-end gap-2" style={{ height }}>
        {values.map((v, i) => (
          <div
            key={i}
            className={cx('flex-1 rounded-t-md', i === highlight ? 'bg-woori-deep' : 'bg-[var(--chart-4)]')}
            style={{ height: Math.max(6, Math.round(((height - 8) * v) / max)) }}
          />
        ))}
      </div>
      {labels && (
        <div className="flex gap-2">
          {labels.map((l) => (
            <span key={l} className="flex-1 text-center text-[11px] text-ink-mute">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- 날씨 ---------- */
const WEATHER = {
  sun: [Sun, 'text-weather-sun'],
  rain: [CloudRain, 'text-weather-rain'],
  cloud: [Cloud, 'text-weather-cloud'],
}
export const WeatherIcon = ({ type, size = 20, className }) => {
  const [Icon, color] = WEATHER[type]
  return (
    <Icon
      size={size}
      className={cx(color, className)}
      fill="currentColor"
      fillOpacity={type === 'sun' ? 1 : 0.9}
      strokeWidth={1.6}
    />
  )
}
export const WeatherStrip = ({ days }) => (
  <div className="flex">
    {days.map(({ d, w, t }, i) => (
      <div key={d + i} className="flex flex-1 flex-col items-center gap-1.5">
        <span className={cx('text-xs', i === 0 ? 'font-bold text-woori-deep' : 'text-ink-sub')}>{d}</span>
        <WeatherIcon type={w} size={24} />
        <span className="text-[13px] font-bold text-ink">{t}</span>
      </div>
    ))}
  </div>
)
