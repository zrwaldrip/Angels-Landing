import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
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
import DonorPortalPage from './pages/DonorPortalPage';
import UserManagementPage from './pages/UserManagementPage';

function AppRoutes() {
  const { authSession, isAuthenticated } = useAuth();
  const isAdmin = authSession.roles.includes('Admin');
  const hasDonorRole = authSession.roles.includes('Donor');
  const hasDonorPrivileges = hasDonorRole || isAdmin;
  const isDonorOnly = isAuthenticated && hasDonorRole && !isAdmin;
  const authenticatedHome = isDonorOnly ? '/donor-portal' : '/residents';

  return (
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to={authenticatedHome} replace /> : <RegisterPage />} />
      <Route path="/logout" element={<LogoutPage />} />
      <Route path="/mfa" element={<ManageMFAPage />} />
      <Route path="/cookies" element={isDonorOnly ? <Navigate to="/donor-portal" replace /> : <CookiePolicyPage />} />
      <Route path="/donor-portal" element={hasDonorPrivileges ? <DonorPortalPage /> : <Navigate to="/" replace />} />

      {isDonorOnly ? (
        <Route path="*" element={<Navigate to="/donor-portal" replace />} />
      ) : (
        <>
          <Route path="/residents" element={<ResidentsPage />} />
          <Route path="/safehouses" element={<SafehousesPage />} />
          <Route path="/donations" element={<DonationsPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/users" element={isAdmin ? <UserManagementPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <CookieConsentProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <CookieConsentBanner />
        </Router>
      </AuthProvider>
    </CookieConsentProvider>
  );
}

export default App;
