import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../lib/authAPI';

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshAuthState } = useAuth();
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState(searchParams.get('externalError') ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    try {
      await loginUser(email, password, rememberMe, twoFactorCode || undefined, recoveryCode || undefined);
      await refreshAuthState();
      navigate('/residents');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to log in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container mt-4">
      <Header />
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h2 className="h4 mb-3">Login</h2>
              <p className="text-muted">
                Sign in to the Angels' Landing portal. If MFA is enabled for your account, include either an
                authenticator code or a recovery code.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" className="form-control" autoComplete="username" required />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="password">Password</label>
                  <input id="password" name="password" type="password" className="form-control" autoComplete="current-password" required />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="twoFactorCode">Authenticator code</label>
                  <input
                    id="twoFactorCode" name="twoFactorCode" type="text" className="form-control"
                    inputMode="numeric" autoComplete="one-time-code"
                    value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value)}
                  />
                  <div className="form-text">Leave blank unless MFA is enabled on the account.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="recoveryCode">Recovery code</label>
                  <input
                    id="recoveryCode" name="recoveryCode" type="text" className="form-control"
                    autoComplete="off" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)}
                  />
                  <div className="form-text">Use a recovery code instead of an authenticator code when needed.</div>
                </div>
                <div className="form-check mb-3">
                  <input
                    id="rememberMe" name="rememberMe" type="checkbox" className="form-check-input"
                    checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="rememberMe">Keep me signed in across browser restarts</label>
                </div>
                {errorMessage ? <div className="alert alert-danger" role="alert">{errorMessage}</div> : null}
                <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
              <p className="mt-3 mb-0">
                Need an account? <Link to="/register">Register here</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
