import { FormEvent, useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CookieConsentProvider } from "./context/CookieConsentContext";
import { useAuth } from "./context/AuthContext";
import CookieConsentBanner from "./components/CookieConsentBanner";
import TutorialOverlay from "./components/TutorialOverlay";
import Footer from "./components/Footer.tsx";
import { TutorialProvider } from "./context/TutorialContext";
import { convertCurrency, createMyDonation } from "./lib/lighthouseAPI";
import GuestOnlyRoute from "./routes/GuestOnlyRoute";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleRoute from "./routes/RoleRoute";
import { normalizeRoles } from "./routes/roleRouting";
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
import PartnersPage from "./pages/PartnersPage";
import IncidentsPage from "./pages/IncidentsPage";
import ProcessRecordingsPage from "./pages/ProcessRecordingsPage";
import DonorPortalPage from "./pages/DonorPortalPage";
import DonorImpactPage from "./pages/DonorImpactPage";
import UserManagementPage from "./pages/UserManagementPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import CampaignAnalysisPage from "./pages/CampaignAnalysisPage";
import HomeVisitationCaseConferencePage from "./pages/HomeVisitationCaseConferencePage";

function AppLayout() {
	const location = useLocation();
	const navigate = useNavigate();
	const { authSession, isAuthenticated, isLoading } = useAuth();
	const normalizedRoles = normalizeRoles(authSession.roles);
	const canOpenDonateModal = isAuthenticated;
	const isLandingRoute = location.pathname === "/";
	const [showDonateModal, setShowDonateModal] = useState(false);
	const [donating, setDonating] = useState(false);
	const [donateError, setDonateError] = useState("");
	const [fxPreview, setFxPreview] = useState("");
	const [fxLoading, setFxLoading] = useState(false);
	const [fxError, setFxError] = useState("");
	const [donationForm, setDonationForm] = useState({
		amount: "",
		currencyCode: "PHP",
		campaignName: "",
		isRecurring: false,
		notes: "",
	});

	useEffect(() => {
		window.scrollTo({ top: 0, left: 0, behavior: "auto" });
	}, [location.pathname, location.search]);

	useEffect(() => {
		function handleOpenDonateModal() {
			if (!isLoading && canOpenDonateModal) {
				setDonateError("");
				setFxError("");
				setShowDonateModal(true);
			}
		}

		window.addEventListener("open-donate-modal", handleOpenDonateModal);
		return () => window.removeEventListener("open-donate-modal", handleOpenDonateModal);
	}, [canOpenDonateModal, isLoading]);

	useEffect(() => {
		const params = new URLSearchParams(location.search);
		if (params.get("donate") !== "1") return;
		if (!isLoading && canOpenDonateModal) {
			setShowDonateModal(true);
		}
		params.delete("donate");
		navigate({ pathname: location.pathname, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true });
	}, [canOpenDonateModal, isLoading, location.pathname, location.search, navigate]);

	useEffect(() => {
		const amountText = donationForm.amount.trim();
		const amount = amountText ? Number(amountText) : Number.NaN;
		if (!Number.isFinite(amount) || amount <= 0) {
			setFxPreview("");
			setFxError("");
			setFxLoading(false);
			return;
		}

		const from = donationForm.currencyCode as "USD" | "PHP";
		const to: "USD" | "PHP" = from === "USD" ? "PHP" : "USD";
		let cancelled = false;

		const timeoutId = setTimeout(async () => {
			setFxLoading(true);
			setFxError("");
			try {
				const conversion = await convertCurrency(from, to, amount);
				if (cancelled) return;
				setFxPreview(
					`${amount.toFixed(2)} ${from} ≈ ${conversion.convertedAmount.toFixed(2)} ${to} ` +
						`(1 ${from} = ${conversion.rate.toFixed(4)} ${to}, ${conversion.asOfDate})`,
				);
			} catch (error) {
				if (cancelled) return;
				setFxPreview("");
				setFxError(error instanceof Error ? error.message : "Unable to fetch live conversion right now.");
			} finally {
				if (!cancelled) setFxLoading(false);
			}
		}, 300);

		return () => {
			cancelled = true;
			clearTimeout(timeoutId);
		};
	}, [donationForm.amount, donationForm.currencyCode]);

	async function handleSubmitDonation(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setDonating(true);
		setDonateError("");

		const amountText = donationForm.amount.trim();
		const amount = amountText ? Number(amountText) : undefined;
		if (amountText && Number.isNaN(amount)) {
			setDonateError("Amount must be a valid number.");
			setDonating(false);
			return;
		}

		if (amount == null || amount <= 0) {
			setDonateError("Amount must be greater than zero.");
			setDonating(false);
			return;
		}

		try {
			await createMyDonation({
				amount,
				currencyCode: donationForm.currencyCode,
				campaignName: donationForm.campaignName || undefined,
				isRecurring: donationForm.isRecurring,
				notes: donationForm.notes || undefined,
			});
			setShowDonateModal(false);
			setDonationForm({
				amount: "",
				currencyCode: "PHP",
				campaignName: "",
				isRecurring: false,
				notes: "",
			});
			setFxPreview("");
			setFxError("");
		} catch (error) {
			setDonateError(error instanceof Error ? error.message : "Failed to create donation.");
		} finally {
			setDonating(false);
		}
	}

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
						path="/partners"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<PartnersPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/process-recordings"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<ProcessRecordingsPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
					<Route
						path="/home-visitation-conferences"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<HomeVisitationCaseConferencePage />
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
						path="/admin-dashboard"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<AdminDashboardPage />
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
					<Route
						path="/admin-reports"
						element={
							<ProtectedRoute>
								<RoleRoute allowedRoles={["Admin"]}>
									<AdminReportsPage />
								</RoleRoute>
							</ProtectedRoute>
						}
					/>
				</Routes>

				{showDonateModal ? (
					<div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.65)" }}>
						<div className="modal-dialog">
							<div className="modal-content">
								<form onSubmit={handleSubmitDonation}>
									<div className="modal-header">
										<h5 className="modal-title">Post a Donation</h5>
										<button type="button" className="btn-close" onClick={() => setShowDonateModal(false)} />
									</div>
									<div className="modal-body">
										{donateError ? <div className="alert alert-danger">{donateError}</div> : null}
										<div className="alert alert-info py-2 px-3 small">
											This donor form records money donations only. Non-cash contributions are tracked by staff through the admin
											workflow.
										</div>
										<div className="mb-2">
											<label className="form-label">Donation Amount</label>
											<div className="row g-2">
												<div className="col-8">
													<input
														type="number"
														min="1"
														step="1"
														className="form-control"
														placeholder="e.g. 1500"
														value={donationForm.amount}
														onChange={(e) => setDonationForm((prev) => ({ ...prev, amount: e.target.value }))}
													/>
												</div>
												<div className="col-4">
													<select
														className="form-select"
														value={donationForm.currencyCode}
														onChange={(e) => setDonationForm((prev) => ({ ...prev, currencyCode: e.target.value }))}
													>
														<option value="PHP">PHP</option>
														<option value="USD">USD</option>
													</select>
												</div>
											</div>
											<div className="form-text">You can donate in PHP or USD.</div>
											{fxLoading ? <div className="form-text">Fetching live conversion...</div> : null}
											{fxPreview ? <div className="form-text">{fxPreview}</div> : null}
											{fxError ? <div className="text-danger small">{fxError}</div> : null}
										</div>
										<div className="mb-2">
											<label className="form-label">Campaign (optional)</label>
											<select
												className="form-control"
												value={donationForm.campaignName}
												onChange={(e) => setDonationForm((prev) => ({ ...prev, campaignName: e.target.value }))}
											>
												<option value="">No campaign</option>
												<option value="Year-End Hope">Year-End Hope</option>
												<option value="GivingTuesday">GivingTuesday</option>
												<option value="Summer of Safety">Summer of Safety</option>
												<option value="Back to School">Back to School</option>
											</select>
										</div>
										<div className="form-check mb-2">
											<input
												id="globalIsRecurring"
												type="checkbox"
												className="form-check-input"
												checked={donationForm.isRecurring}
												onChange={(e) => setDonationForm((prev) => ({ ...prev, isRecurring: e.target.checked }))}
											/>
											<label htmlFor="globalIsRecurring" className="form-check-label">
												Recurring donation
											</label>
											<div className="form-text">Check this if this gift repeats over time.</div>
										</div>
										<div className="mb-2">
											<label className="form-label">Notes</label>
											<textarea
												className="form-control"
												rows={3}
												value={donationForm.notes}
												onChange={(e) => setDonationForm((prev) => ({ ...prev, notes: e.target.value }))}
											/>
										</div>
									</div>
									<div className="modal-footer">
										<button type="button" className="btn btn-secondary" onClick={() => setShowDonateModal(false)}>
											Cancel
										</button>
										<button type="submit" className="btn btn-primary" disabled={donating}>
											{donating ? "Posting..." : "Post Donation"}
										</button>
									</div>
								</form>
							</div>
						</div>
					</div>
				) : null}
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
					<TutorialProvider>
						<AppLayout />
						<TutorialOverlay />
          <CookieConsentBanner />
					</TutorialProvider>
        </Router>
      </AuthProvider>
    </CookieConsentProvider>
  );
}

export default App;
