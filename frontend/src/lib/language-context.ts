import { createContext } from "react";
import type { SupportedLanguage } from "./types";

export interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

// Split out from language.tsx / hooks/useLanguage.ts so each of those
// files exports only one thing (a component, a hook) — Fast Refresh needs
// that to hot-reload correctly.
export const LanguageContext = createContext<LanguageContextValue | null>(null);
