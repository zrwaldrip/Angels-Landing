import { NavLink } from 'react-router-dom';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer mt-4">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2">
        <p className="mb-0 text-muted small">© {year} Angels' Landing</p>
        <nav className="d-flex gap-3">
          <NavLink className="footer-link small" to="/cookies">Cookie Policy</NavLink>
          <NavLink className="footer-link small" to="/privacy">Privacy Policy</NavLink>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
