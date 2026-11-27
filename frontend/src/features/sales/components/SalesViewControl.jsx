/** 매출의 그래프·단위·프로모션 필터. 터치 영역과 선택 상태를 함께 제공한다. */
export default function SalesViewControl({ label, items, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 gap-1 rounded-input bg-surface-muted p-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          className={`min-h-11 min-w-0 flex-1 rounded-lg px-2 text-label transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-woori-blue ${value === item.value ? 'bg-white font-bold text-woori-deep shadow-sm' : 'font-medium text-ink-sub hover:text-ink'}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
