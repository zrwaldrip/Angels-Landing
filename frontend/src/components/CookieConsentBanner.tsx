import { Link } from 'react-router-dom';
import { useCookieConsent } from '../context/CookieConsentContext';

function CookieConsentBanner() {
  const { hasAcknowledgedConsent, acknowledgeConsent } = useCookieConsent();

  if (hasAcknowledgedConsent) return null;

  return (
    <aside className="cookie-consent-banner shadow-lg" role="dialog" aria-live="polite">
      <div className="cookie-consent-copy">
        <p className="cookie-consent-eyebrow mb-2">Cookie notice</p>
        <p className="mb-2">
          Angels' Landing uses essential cookies for sign-in and security features.
        </p>
        <p className="mb-0">
          We are not using analytics or marketing cookies. Read the{' '}
          <Link to="/cookies">cookie policy</Link> for full details.
        </p>
      </div>
      <button type="button" className="btn btn-warning fw-semibold" onClick={acknowledgeConsent}>
        Acknowledge essential cookies
      </button>
    </aside>
  );
}

export default CookieConsentBanner;
