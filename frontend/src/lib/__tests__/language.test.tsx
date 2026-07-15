import { afterEach, describe, expect, it } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageProvider, useLanguage } from "@/lib/language";
import { T } from "@/lib/translations";

const STORAGE_KEY = "stadium-copilot:language";

function wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

function LabelForKey({ translationKey }: { translationKey: string }) {
  const { language, setLanguage } = useLanguage();
  const t = T[language];
  return (
    <div>
      <span data-testid="label">{t[translationKey]}</span>
      <button onClick={() => setLanguage("fr")}>fr</button>
      <button onClick={() => setLanguage("pt")}>pt</button>
    </div>
  );
}

describe("LanguageProvider / useLanguage", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("defaults to English when nothing is stored", () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe("en");
  });

  it("initializes from a valid stored language", () => {
    localStorage.setItem(STORAGE_KEY, "pt");
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe("pt");
  });

  it("falls back to English for an invalid stored language", () => {
    localStorage.setItem(STORAGE_KEY, "de");
    const { result } = renderHook(() => useLanguage(), { wrapper });
    expect(result.current.language).toBe("en");
  });

  it("throws when useLanguage is used outside a LanguageProvider", () => {
    const { result } = renderHook(() => {
      try {
        return useLanguage();
      } catch (err) {
        return err;
      }
    });
    expect(result.current).toBeInstanceOf(Error);
  });

  it("persists the selected language to localStorage", () => {
    const { result } = renderHook(() => useLanguage(), { wrapper });
    act(() => result.current.setLanguage("fr"));
    expect(localStorage.getItem(STORAGE_KEY)).toBe("fr");
    expect(result.current.language).toBe("fr");
  });

  it("changes what a translation key resolves to when the language switches", async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <LabelForKey translationKey="appName" />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("label")).toHaveTextContent(T.en.appName);

    await user.click(screen.getByRole("button", { name: "fr" }));
    expect(screen.getByTestId("label")).toHaveTextContent(T.fr.appName);

    await user.click(screen.getByRole("button", { name: "pt" }));
    expect(screen.getByTestId("label")).toHaveTextContent(T.pt.appName);
  });

  it("resolves a missing translation key to undefined without throwing, rendering nothing", () => {
    // T[language] is a plain Record<string, string> with no fallback for
    // unknown keys — this locks down that documented-by-absence behavior
    // rather than assuming a fallback exists.
    render(
      <LanguageProvider>
        <LabelForKey translationKey="thisKeyDoesNotExist" />
      </LanguageProvider>,
    );

    expect(screen.getByTestId("label")).toBeEmptyDOMElement();
    expect(T.en.thisKeyDoesNotExist).toBeUndefined();
  });
});
