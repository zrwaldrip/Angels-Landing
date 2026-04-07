import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { registerUser } from '../lib/authAPI';

function RegisterPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords must match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerUser(email, password);
      setSuccessMessage('Registration succeeded. You can log in now.');
      setTimeout(() => navigate('/login'), 800);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to register.');
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
              <h2 className="h4 mb-3">Register</h2>
              <p className="text-muted">
                Create an account for Angels' Landing staff and supporter workflows.
              </p>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" className="form-control" autoComplete="username" required />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="password">Password</label>
                  <input id="password" name="password" type="password" className="form-control" autoComplete="new-password" required />
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="confirmPassword">Confirm password</label>
                  <input id="confirmPassword" name="confirmPassword" type="password" className="form-control" autoComplete="new-password" required />
                </div>
                {errorMessage ? <div className="alert alert-danger" role="alert">{errorMessage}</div> : null}
                {successMessage ? <div className="alert alert-success" role="alert">{successMessage}</div> : null}
                <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating account...' : 'Create account'}
                </button>
              </form>
              <p className="mt-3 mb-0">
                Already registered? <Link to="/login">Go to login</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
