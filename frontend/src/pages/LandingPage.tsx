import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { useAuth } from '../context/AuthContext';

function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="container mt-4">
      <Header />
      <section className="text-center py-5">
        <h1 className="display-4 fw-bold">Angels' Landing</h1>
        <p className="lead mt-3">
          Providing safety, healing, and hope for vulnerable girls through secure care, compassionate support, and
          data-driven impact.
        </p>
        {!isAuthenticated ? (
          <div className="d-flex justify-content-center gap-3 mt-4 flex-wrap">
            <Link to="/register" className="btn btn-primary btn-lg">Get Started</Link>
            <Link to="/login" className="btn btn-outline-secondary btn-lg">Login</Link>
          </div>
        ) : null}
      </section>

      <section className="row text-center g-4 pb-5">
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h3 className="h5">Protect</h3>
              <p className="mb-0">Support safe, structured housing for girls in need of care and protection.</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h3 className="h5">Restore</h3>
              <p className="mb-0">Track counseling, education, and health progress effectively.</p>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h3 className="h5">Measure Impact</h3>
              <p className="mb-0">Connect donations and outcomes through data-driven insights.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
