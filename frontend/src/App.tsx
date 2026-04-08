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
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import ResidentsPage from './pages/ResidentsPage';
import SafehousesPage from './pages/SafehousesPage';
import DonationsPage from './pages/DonationsPage';
import IncidentsPage from './pages/IncidentsPage';
import Footer from './components/Footer.tsx';
import ProtectedRoute from './routes/ProtectedRoute';
import GuestOnlyRoute from './routes/GuestOnlyRoute';
import RoleRoute from './routes/RoleRoute';

function App() {
  return (
    <CookieConsentProvider>
      <AuthProvider>
        <Router>
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
          <CookieConsentBanner />
        </Router>
      </AuthProvider>
    </CookieConsentProvider>
  );
}

export default App;
