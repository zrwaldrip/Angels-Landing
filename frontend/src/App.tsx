import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CookieConsentProvider } from './context/CookieConsentContext';
import CookieConsentBanner from './components/CookieConsentBanner';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import LogoutPage from './pages/LogoutPage';
import ManageMFAPage from './pages/ManageMFAPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import ResidentsPage from './pages/ResidentsPage';
import SafehousesPage from './pages/SafehousesPage';
import DonationsPage from './pages/DonationsPage';
import IncidentsPage from './pages/IncidentsPage';
import SocialMediaInsights from './pages/admin/SocialMediaInsights';

function App() {
  return (
    <CookieConsentProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/mfa" element={<ManageMFAPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route path="/residents" element={<ResidentsPage />} />
            <Route path="/safehouses" element={<SafehousesPage />} />
            <Route path="/donations" element={<DonationsPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/admin/social-media-insights" element={<SocialMediaInsights />} />
          </Routes>
          <CookieConsentBanner />
        </Router>
      </AuthProvider>
    </CookieConsentProvider>
  );
}

export default App;