import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { normalizeRoles } from '../routes/roleRouting';

function Header() {
  const { authSession, isAuthenticated, isLoading } = useAuth();
  const normalizedRoles = normalizeRoles(authSession.roles);
  const isAdmin = normalizedRoles.includes('admin');
  const isDonor = normalizedRoles.includes('donor');
  const navClassName = ({ isActive }: { isActive: boolean }) =>
    `app-header-link ${isActive ? 'app-header-link-active' : ''}`;

  const statusText = isLoading
    ? 'Checking sign-in…'
    : isAuthenticated
      ? `Signed in as ${authSession.userName ?? authSession.email ?? 'user'}`
      : 'Not signed in';

  const statusClassName = `badge ${
    isLoading ? 'bg-secondary' : isAuthenticated ? 'bg-success' : 'bg-warning text-dark'
  }`;

  return (
    <header className="app-header fixed-top bg-primary text-white">
      <div className="container py-3">
        <div className="app-header-inner">
          <NavLink to="/" className="app-brand text-white text-decoration-none">
            <h1 className="h4 mb-0 fw-bold">Angels' Landing</h1>
          </NavLink>

          <nav className="app-main-nav">
            {isAuthenticated && (
              <>
                {isAdmin ? (
                  <>
                    <NavLink className={navClassName} to="/residents">Residents</NavLink>
                    <NavLink className={navClassName} to="/safehouses">Safehouses</NavLink>
                    <NavLink className={navClassName} to="/donations">Donor Portal</NavLink>
                    <NavLink className={navClassName} to="/incidents">Case Records</NavLink>
                  </>
                ) : null}
                {!isAdmin && isDonor ? (
                  <>
                    <NavLink className={navClassName} to="/">Donor Impact</NavLink>
                    <NavLink className={navClassName} to="/donations">Donor Portal</NavLink>
                  </>
                ) : null}
              </>
            )}
          </nav>

          <div className="app-auth-nav">
            <span className={`${statusClassName} app-status-badge`}>{statusText}</span>
            {!isAuthenticated ? (
              <>
                <NavLink className={navClassName} to="/login">Login</NavLink>
                <NavLink className={navClassName} to="/register">Register</NavLink>
              </>
            ) : (
              <>
                <NavLink className={navClassName} to="/mfa">MFA</NavLink>
                <NavLink className={navClassName} to="/logout">Logout</NavLink>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
