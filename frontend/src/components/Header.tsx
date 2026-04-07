import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Header() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');
  const hasDonorRole = authSession.roles.includes('Donor');
  const hasDonorPrivileges = hasDonorRole || isAdmin;
  const isDonorOnly = isAuthenticated && authSession.roles.includes('Donor') && !isAdmin;

  const statusText = isLoading
    ? 'Checking sign-in…'
    : isAuthenticated
      ? `Signed in as ${authSession.userName ?? authSession.email ?? 'user'}`
      : 'Not signed in';

  const statusClassName = `badge ${
    isLoading ? 'bg-secondary' : isAuthenticated ? 'bg-success' : 'bg-warning text-dark'
  }`;

  return (
    <header className="row bg-primary text-white mb-4 p-3 rounded align-items-center">
      <div className="col-lg-3">
        <NavLink to="/" className="text-white text-decoration-none">
          <h1 className="h4 mb-0 fw-bold">Angels' Landing</h1>
        </NavLink>
      </div>

      <div className="col-lg-6 mt-2 mt-lg-0">
        <nav className="d-flex gap-3 flex-wrap">
          {isAuthenticated && (
            <>
              {isDonorOnly ? (
                <>
                  <NavLink className="text-white text-decoration-none" to="/donor-portal">Donor Portal</NavLink>
                  <NavLink className="text-white text-decoration-none" to="/donor-impact">Donor Impact</NavLink>
                </>
              ) : (
                <>
                  <NavLink className="text-white text-decoration-none" to="/residents">Residents</NavLink>
                  <NavLink className="text-white text-decoration-none" to="/safehouses">Safehouses</NavLink>
                  <NavLink className="text-white text-decoration-none" to="/donations">Donations</NavLink>
                  <NavLink className="text-white text-decoration-none" to="/incidents">Case Records</NavLink>
                  {isAdmin ? <NavLink className="text-white text-decoration-none" to="/users">Users</NavLink> : null}
                </>
              )}
            </>
          )}
          {!isDonorOnly ? <NavLink className="text-white text-decoration-none" to="/cookies">Cookies</NavLink> : null}
        </nav>
      </div>

      <div className="col-lg-3 mt-2 mt-lg-0">
        <div className="d-flex gap-3 justify-content-lg-end align-items-center flex-wrap">
          <span className={statusClassName}>{statusText}</span>
          {!isAuthenticated ? (
            <>
              <NavLink className="text-white text-decoration-none" to="/login">Login</NavLink>
              <NavLink className="text-white text-decoration-none" to="/register">Register</NavLink>
            </>
          ) : (
            <>
              {hasDonorPrivileges ? <NavLink className="btn btn-light btn-sm text-primary" to="/donor-portal?donate=1">Donate</NavLink> : null}
              <NavLink className="text-white text-decoration-none" to="/mfa">MFA</NavLink>
              <NavLink className="text-white text-decoration-none" to="/logout">Logout</NavLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
