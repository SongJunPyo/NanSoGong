const cx = (...a) => a.filter(Boolean).join(' ')

/**
 * 같은 목록을 다르게 보기 (정렬 · 기간 · 보기 방식) — 웹 · 앱 같은 모습
 *   화면 이동용 탭은 common/ui 의 Segmented(링크) 를 쓰고, 이건 화면 안 상태를 바꿀 때 쓴다
 *
 *   <SegmentedControl label="정렬" value={sort} onChange={setSort}
 *     items={[{ value: 'total', label: '총액순' }, { value: 'unit', label: '개당가순' }]} />
 */
export function SegmentedControl({ items, value, onChange, label, size = 'md' }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-input bg-surface-muted p-1">
      {items.map((item) => {
        const { value: v, label: text } = typeof item === 'string' ? { value: item, label: item } : item
        const on = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={cx(
              'flex-1 rounded-[9px] text-center transition-colors focus-visible:outline-2 focus-visible:outline-woori-blue',
              size === 'sm' ? 'py-1.5 text-caption' : 'py-[9px] text-label',
              on ? 'bg-white font-bold text-woori-deep shadow-sm' : 'font-medium text-ink-sub hover:text-ink',
            )}
          >
            {text}
          </button>
        )
      })}
    </div>
  )
}
