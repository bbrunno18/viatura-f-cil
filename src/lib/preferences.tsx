import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";
type FontScale = "sm" | "md" | "lg" | "xl";

interface PrefsValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  fontScale: FontScale;
  setFontScale: (f: FontScale) => void;
  highContrast: boolean;
  setHighContrast: (v: boolean) => void;
}

const PrefsContext = createContext<PrefsValue | undefined>(undefined);

const KEY = "frota-prefs-v1";

function read() {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const initial = typeof window !== "undefined" ? read() : null;
  const [theme, setThemeState] = useState<Theme>(initial?.theme ?? "system");
  const [fontScale, setFontScaleState] = useState<FontScale>(initial?.fontScale ?? "md");
  const [highContrast, setHighContrastState] = useState<boolean>(initial?.highContrast ?? false);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = theme === "dark" || (theme === "system" && prefersDark);
    root.classList.toggle("dark", dark);

    const scaleMap: Record<FontScale, string> = { sm: "93.75%", md: "100%", lg: "112.5%", xl: "125%" };
    root.style.fontSize = scaleMap[fontScale];
    root.classList.toggle("hc", highContrast);

    localStorage.setItem(KEY, JSON.stringify({ theme, fontScale, highContrast }));
  }, [theme, fontScale, highContrast]);

  return (
    <PrefsContext.Provider value={{
      theme, setTheme: setThemeState,
      fontScale, setFontScale: setFontScaleState,
      highContrast, setHighContrast: setHighContrastState,
    }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePreferences fora do PreferencesProvider");
  return ctx;
}
