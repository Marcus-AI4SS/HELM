export interface FilterChipOption<T extends string> {
  key: T;
  label: string;
  count?: number;
}

export function FilterChips<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T;
  options: FilterChipOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="filter-chips" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className={option.key === value ? "active" : ""}
          aria-pressed={option.key === value}
          onClick={() => onChange(option.key)}
        >
          <span>{option.label}</span>
          {typeof option.count === "number" ? <small>{option.count}</small> : null}
        </button>
      ))}
    </div>
  );
}
