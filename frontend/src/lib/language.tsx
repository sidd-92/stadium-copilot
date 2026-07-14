import { createContext, useContext, useState, type ReactNode } from "react";
import type { SupportedLanguage } from "./types";

interface LanguageContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "stadium-copilot:language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "fr" || stored === "pt" ? stored : "en";
  });

  function setLanguage(lang: SupportedLanguage) {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
