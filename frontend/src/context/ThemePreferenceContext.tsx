import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const themeStorageKey = 'angelslanding-theme-preference';
const themeCookieName = 'angelslanding_theme_preference';
const lightThemeValue = 'light';
const darkThemeValue = 'dark';

type ThemeMode = 'light' | 'dark';

interface ThemePreferenceContextValue {
  themeMode: ThemeMode;
  toggleThemeMode: () => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue | undefined>(undefined);

function readInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return darkThemeValue;

  try {
    const storageValue = window.localStorage.getItem(themeStorageKey);
    if (storageValue === lightThemeValue || storageValue === darkThemeValue) {
      return storageValue;
    }
  } catch {
    // Safari private browsing can block storage access.
  }

  return readThemeCookie();
}

function readThemeCookie(): ThemeMode {
  if (typeof document === 'undefined') return darkThemeValue;
  const key = `${themeCookieName}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(key)) {
      const value = trimmed.slice(key.length);
      return value === lightThemeValue ? lightThemeValue : darkThemeValue;
    }
  }
  return darkThemeValue;
}

function applyThemeModeClass(themeMode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('theme-light', themeMode === lightThemeValue);
}

function writeThemeCookie(themeMode: ThemeMode) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${themeCookieName}=${themeMode}; Max-Age=31536000; Path=/; SameSite=Lax${secureFlag}`;
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const mode = readInitialThemeMode();
    applyThemeModeClass(mode);
    return mode;
  });

  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      themeMode,
      toggleThemeMode() {
        const nextMode = themeMode === lightThemeValue ? darkThemeValue : lightThemeValue;
        try {
          window.localStorage.setItem(themeStorageKey, nextMode);
        } catch {
          // Fallback cookie still stores preference.
        }
        writeThemeCookie(nextMode);
        applyThemeModeClass(nextMode);
        setThemeMode(nextMode);
      },
    }),
    [themeMode]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemePreferenceContext);
  if (!context) throw new Error('useThemePreference must be used within a ThemePreferenceProvider.');
  return context;
}