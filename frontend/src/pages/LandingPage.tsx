import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

function LandingPage() {
  const { isAuthenticated } = useAuth();

  function handleDonateClick() {
    window.dispatchEvent(new Event('open-donate-modal'));
  }

  return (
    <div className="landing-page">
      <Header />
      <main className="landing-content">
        <section className="landing-hero">
          <p className="landing-eyebrow">Trusted nonprofit operations</p>
          <h1>Safety, healing, and measurable outcomes.</h1>
          <p className="landing-subtitle">
            Angels&apos; Landing delivers secure care and recovery support for vulnerable girls with clear, data-backed
            reporting that keeps every donor impact visible.
          </p>
          <div className="landing-cta-group">
            {isAuthenticated ? (
              <button type="button" className="landing-btn landing-btn-donate" onClick={handleDonateClick}>Donate Now</button>
            ) : (
              <Link to="/login" className="landing-btn landing-btn-donate">Donate Now</Link>
            )}
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="landing-btn landing-btn-primary">Get Started</Link>
                <Link to="/login" className="landing-btn landing-btn-secondary">Login</Link>
              </>
            ) : null}
          </div>
        </section>

        <section className="landing-pillars" aria-label="Mission pillars">
          <article className="landing-card">
            <h3>Protect</h3>
            <p>Deliver safe, structured housing and responsive case management for girls in crisis.</p>
          </article>
          <article className="landing-card">
            <h3>Restore</h3>
            <p>Coordinate counseling, education, and health plans with progress tracked in one system.</p>
          </article>
          <article className="landing-card">
            <h3>Measure Impact</h3>
            <p>Connect every contribution to tangible outcomes through transparent reporting and insights.</p>
          </article>
        </section>
      </main>
    </div>
  );
}

export default LandingPage;
