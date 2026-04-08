import "./App.css";
import { BrowserRouter as Router, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CookieConsentProvider } from "./context/CookieConsentContext";
import CookieConsentBanner from "./components/CookieConsentBanner";
import Footer from "./components/Footer.tsx";
import GuestOnlyRoute from "./routes/GuestOnlyRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LogoutPage from "./pages/LogoutPage";
import ManageMFAPage from "./pages/ManageMFAPage";
import CookiePolicyPage from "./pages/CookiePolicyPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import ResidentsPage from "./pages/ResidentsPage";
import SafehousesPage from "./pages/SafehousesPage";
import DonationsPage from "./pages/DonationsPage";
import IncidentsPage from "./pages/IncidentsPage";
import DonorPortalPage from "./pages/DonorPortalPage";
import DonorImpactPage from "./pages/DonorImpactPage";
import UserManagementPage from "./pages/UserManagementPage";
import CampaignAnalysisPage from "./pages/CampaignAnalysisPage";

function AppLayout() {
	const location = useLocation();
	const isLandingRoute = location.pathname === "/";

	return (
		<div className={`app-shell ${isLandingRoute ? "app-shell-landing" : ""}`}>
			<main className="app-main">
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route
						path="/login"
						element={
							<GuestOnlyRoute>
								<LoginPage />
							</GuestOnlyRoute>
						}
					/>
					<Route
						path="/register"
						element={
							<GuestOnlyRoute>
								<RegisterPage />
							</GuestOnlyRoute>
						}
					/>
					<Route path="/logout" element={<LogoutPage />} />
					<Route
						path="/mfa"
						element={
							<ProtectedRoute>
								<ManageMFAPage />
							</ProtectedRoute>
						}
					/>
					<Route path="/cookies" element={<CookiePolicyPage />} />
					<Route path="/privacy" element={<PrivacyPolicyPage />} />
					<Route path="/unauthorized" element={<UnauthorizedPage />} />

					<Route path="/donor-impact" element={<DonorImpactPage />} />
					<Route
						path="/donor-portal"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Donor", "Admin"]}>
									<DonorPortalPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>

					<Route
						path="/residents"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<ResidentsPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/safehouses"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<SafehousesPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/donations"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<DonationsPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/campaign-analysis"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<CampaignAnalysisPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/incidents"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<IncidentsPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/users"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<UserManagementPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
				</Routes>
			</main>
			<Footer />
		</div>
	);
}

function App() {
	return (
		<CookieConsentProvider>
			<AuthProvider>
				<Router>
					<AppLayout />
					<CookieConsentBanner />
				</Router>
			</AuthProvider>
		</CookieConsentProvider>
	);
}

export default App;
