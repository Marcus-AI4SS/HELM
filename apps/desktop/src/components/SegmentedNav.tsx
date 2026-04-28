import { PAGES } from "../navigation";
import type { PageKey } from "../types";

export function SegmentedNav({ active, onSelect }: { active: PageKey; onSelect: (key: PageKey) => void }) {
  return (
    <nav className="segmented-nav" aria-label="主导航">
      {PAGES.map((page) => {
        const Icon = page.icon;
        return (
          <button
            key={page.key}
            type="button"
            className={active === page.key ? "active" : ""}
            aria-current={active === page.key ? "page" : undefined}
            onClick={() => onSelect(page.key)}
          >
            <Icon size={16} />
            {page.label}
            {page.weight === "secondary" ? <small>辅助</small> : null}
          </button>
        );
      })}
    </nav>
  );
}
