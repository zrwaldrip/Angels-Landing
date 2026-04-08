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
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ResidentsPage from './pages/ResidentsPage';
import SafehousesPage from './pages/SafehousesPage';
import DonationsPage from './pages/DonationsPage';
import IncidentsPage from './pages/IncidentsPage';
<<<<<<< HEAD
import Footer from './components/Footer.tsx';
import ProtectedRoute from './routes/ProtectedRoute';
import GuestOnlyRoute from './routes/GuestOnlyRoute';
import RoleRoute from './routes/RoleRoute';
=======
import DonorPortalPage from './pages/DonorPortalPage';
import UserManagementPage from './pages/UserManagementPage';
import DonorImpactPage from './pages/DonorImpactPage';

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
      <Route path="/donor-impact" element={hasDonorPrivileges ? <DonorImpactPage /> : <Navigate to="/" replace />} />

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
>>>>>>> 2eeb9ae847f556396671d6c94350825068ee5edd

function App() {
  return (
    <CookieConsentProvider>
      <AuthProvider>
        <Router>
<<<<<<< HEAD
          <div className="app-shell">
            <main className="app-main">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
                <Route path="/register" element={<GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>} />
                <Route path="/logout" element={<LogoutPage />} />
                <Route path="/mfa" element={<ProtectedRoute><ManageMFAPage /></ProtectedRoute>} />
                <Route path="/cookies" element={<CookiePolicyPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route
                  path="/residents"
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowedRoles={['Admin']}>
                        <ResidentsPage />
                      </RoleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/safehouses"
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowedRoles={['Admin']}>
                        <SafehousesPage />
                      </RoleRoute>
                    </ProtectedRoute>
                  }
                />
                <Route path="/donations" element={<ProtectedRoute><DonationsPage /></ProtectedRoute>} />
                <Route
                  path="/incidents"
                  element={
                    <ProtectedRoute>
                      <RoleRoute allowedRoles={['Admin']}>
                        <IncidentsPage />
                      </RoleRoute>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
            <Footer />
          </div>
=======
          <AppRoutes />
>>>>>>> 2eeb9ae847f556396671d6c94350825068ee5edd
          <CookieConsentBanner />
        </Router>
      </AuthProvider>
    </CookieConsentProvider>
  );
}

export default App;
