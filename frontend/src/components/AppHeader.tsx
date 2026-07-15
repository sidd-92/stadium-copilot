import { Link } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { cn } from "@/lib/utils";
import type { SupportedLanguage } from "@/lib/types";

const LANGS: SupportedLanguage[] = ["en", "fr", "pt"];

// Real app header — replaces the phone-mockup status bar / dynamic
// island from the Figma prototype (that was scaffolding for viewing
// designs inside Figma Make, not something a real mobile browser needs).
// The language switcher here is wired to actual app state: it drives the
// `language` param sent to getMenu/order-service, not just a UI toggle.
export function AppHeader({ inverted = false }: { inverted?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <header
      className={cn(
        "flex shrink-0 items-center justify-between border-b px-5 py-3",
        inverted ? "bg-[var(--sc-space)] border-white/10" : "bg-[var(--sc-card)] border-[var(--sc-border)]",
      )}
    >
      <Link to="/" className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--sc-ember)]">
          <span className="text-sm font-extrabold text-white">⚡</span>
        </div>
        <span className={cn("text-[15px] font-bold tracking-tight", inverted ? "text-white" : "text-[var(--sc-ink)]")}>
          Stadium Copilot
        </span>
      </Link>

      <div className={cn("flex gap-0.5 rounded-lg p-0.5", inverted ? "bg-white/10" : "bg-[var(--sc-surface-2)]")}>
        {LANGS.map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-wide transition-colors",
              lang === language
                ? "bg-[var(--sc-ember)] text-white"
                : inverted
                  ? "text-white/50"
                  : "text-[var(--sc-graphite)]",
            )}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}
