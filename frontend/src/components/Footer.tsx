import { NavLink } from 'react-router-dom';

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <p className="app-footer-copy">© {year} Angels' Landing</p>
        <nav className="app-footer-nav" aria-label="Footer links">
          <NavLink className="footer-link" to="/cookies">Cookie Policy</NavLink>
          <NavLink className="footer-link" to="/privacy">Privacy Policy</NavLink>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
