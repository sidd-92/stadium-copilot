const PRESET_TAGS = ["vegan", "vegetarian", "nut-free", "gluten-free", "dairy-free"];

export function DietaryFilterBar({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
      {PRESET_TAGS.map((tag) => {
        const active = selected.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              active
                ? "bg-[var(--sc-space)] text-white"
                : "border border-[var(--sc-border)] bg-[var(--sc-card)] text-[var(--sc-graphite)]"
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
