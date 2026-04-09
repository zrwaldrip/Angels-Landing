import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const cookieConsentStorageKey = 'angelslanding-cookie-consent';
const cookieConsentName = 'angelslanding_cookie_consent';
const acknowledgedValue = 'acknowledged';

interface CookieConsentContextValue {
  hasAcknowledgedConsent: boolean;
  acknowledgeConsent: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

function readInitialConsentValue() {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(cookieConsentStorageKey) === acknowledgedValue) return true;
  } catch {
    // Safari private browsing can block storage access.
  }
  return readConsentCookie();
}

function readConsentCookie() {
  if (typeof document === 'undefined') return false;
  const key = `${cookieConsentName}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(key)) return trimmed.slice(key.length) === acknowledgedValue;
  }
  return false;
}

function writeConsentCookie() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${cookieConsentName}=${acknowledgedValue}; Max-Age=31536000; Path=/; SameSite=Lax${secureFlag}`;
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [hasAcknowledgedConsent, setHasAcknowledgedConsent] = useState(readInitialConsentValue);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      hasAcknowledgedConsent,
      acknowledgeConsent() {
        try {
          window.localStorage.setItem(cookieConsentStorageKey, acknowledgedValue);
        } catch {
          // Fallback cookie still stores acknowledgement.
        }
        writeConsentCookie();
        setHasAcknowledgedConsent(true);
      },
    }),
    [hasAcknowledgedConsent]
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) throw new Error('useCookieConsent must be used within a CookieConsentProvider.');
  return context;
}
