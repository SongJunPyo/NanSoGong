/** 메뉴 화면 안의 보기·필터 선택. 일반 버튼으로 Tab·Enter·Space 조작을 지원한다. */
export default function MenuViewControl({ label, items, value, onChange }) {
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
