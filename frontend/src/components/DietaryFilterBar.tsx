import { Badge } from "@/components/ui/badge";

const PRESET_TAGS = ["vegan", "vegetarian", "nut-free", "gluten-free", "dairy-free"];

export function DietaryFilterBar({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PRESET_TAGS.map((tag) => {
        const active = selected.includes(tag);
        return (
          <Badge
            key={tag}
            variant={active ? "default" : "outline"}
            className="cursor-pointer select-none"
            onClick={() => onToggle(tag)}
          >
            {tag}
          </Badge>
        );
      })}
    </div>
  );
}
