import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTutorial } from "../context/TutorialContext";
import { normalizeRoles } from "../routes/roleRouting";

function Header() {
	const { authSession, isAuthenticated, isLoading } = useAuth();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [openNavMenu, setOpenNavMenu] = useState<"operations" | "admin" | null>(null);
	const navMenusRef = useRef<HTMLDivElement | null>(null);
	const normalizedRoles = normalizeRoles(authSession.roles);
	const isAdmin = normalizedRoles.includes("admin");
	const isDonor = normalizedRoles.includes("donor");
	const { startTutorial, isOpen: isTutorialOpen, currentStep } = useTutorial();
	const navClassName = ({ isActive }: { isActive: boolean }) => `app-header-link ${isActive ? "app-header-link-active" : ""}`;
	const profileInitial = (authSession.email?.trim().charAt(0) || "U").toUpperCase();

	function closeMobileMenu() {
		setIsMobileMenuOpen(false);
		setOpenNavMenu(null);
	}

	useEffect(() => {
		function handlePointerDown(event: MouseEvent) {
			if (!navMenusRef.current) return;
			const target = event.target as Node | null;
			if (target && !navMenusRef.current.contains(target)) {
				setOpenNavMenu(null);
			}
		}

		document.addEventListener("mousedown", handlePointerDown);
		return () => document.removeEventListener("mousedown", handlePointerDown);
	}, []);

	useEffect(() => {
		if (!isTutorialOpen) return;

		const key = currentStep?.highlightKey ?? "";
		const operationsStepKeys = new Set([
			"operations",
			"operations-incidents",
			"operations-home-visitation",
			"operations-partners",
			"operations-process-recordings",
			"operations-residents",
			"operations-safehouses"
		]);
		const adminStepKeys = new Set([
			"admin",
			"admin-dashboard",
			"admin-campaign-analysis",
			"admin-donations",
			"admin-reports",
			"admin-users"
		]);

		if (operationsStepKeys.has(key)) {
			setOpenNavMenu("operations");
			return;
		}

		if (adminStepKeys.has(key)) {
			setOpenNavMenu("admin");
			return;
		}

		setOpenNavMenu(null);
	}, [isTutorialOpen, currentStep?.highlightKey]);

	useEffect(() => {
		if (!isTutorialOpen) return;
		if (window.matchMedia("(max-width: 991.98px)").matches) {
			setIsMobileMenuOpen(true);
		}
	}, [isTutorialOpen, currentStep?.highlightKey]);

	function toggleNavMenu(menu: "operations" | "admin") {
		setOpenNavMenu((prev) => (prev === menu ? null : menu));
	}

	function openDonateModal() {
		closeMobileMenu();
		window.dispatchEvent(new Event("open-donate-modal"));
	}

	function handleStartTutorial() {
		closeMobileMenu();
		setOpenNavMenu(null);
		startTutorial();
	}

	function getHighlightClass(key: string) {
		return isTutorialOpen && currentStep?.highlightKey === key ? "tutorial-highlight" : "";
	}

	function navClassWithHighlight(key: string) {
		return ({ isActive }: { isActive: boolean }) => `${navClassName({ isActive })} ${getHighlightClass(key)}`.trim();
	}

	return (
		<header className={`app-header fixed-top ${isTutorialOpen ? "app-header-tutorial-active" : ""}`}>
			<div className="container-fluid app-header-container">
				<div className="app-header-inner">
					<NavLink to="/" className="app-brand">
						<h1 className="h5 mb-0 fw-semibold">Angels' Landing</h1>
					</NavLink>

					<button
						type="button"
						className="app-menu-toggle"
						aria-expanded={isMobileMenuOpen}
						aria-label="Toggle navigation menu"
						onClick={() => setIsMobileMenuOpen((prev) => !prev)}
					>
						<span />
						<span />
						<span />
					</button>

					<div className={`app-nav-shell ${isMobileMenuOpen ? "app-nav-shell-open" : ""}`}>
						<nav className="app-main-nav" ref={navMenusRef}>
							<NavLink className={navClassWithHighlight("home")} data-tutorial-key="home" to="/" onClick={closeMobileMenu}>
								Home
							</NavLink>
							<NavLink className={navClassWithHighlight("impact")} data-tutorial-key="impact" to="/donor-impact" onClick={closeMobileMenu}>
								Impact
							</NavLink>
							{isAuthenticated && isDonor ? (
								<NavLink className={navClassWithHighlight("donor-portal")} data-tutorial-key="donor-portal" to="/donor-portal" onClick={closeMobileMenu}>
									Donor Portal
								</NavLink>
							) : null}

							{isAuthenticated && isAdmin ? (
								<NavLink className={navClassName} to="/process-recordings" onClick={closeMobileMenu}>
									Process Recordings
								</NavLink>
							) : null}

							{isAuthenticated && isAdmin ? (
								<div className={`app-menu-dropdown ${openNavMenu === "operations" ? "app-menu-dropdown-open" : ""}`}>
									<button type="button" data-tutorial-key="operations" className={`app-menu-summary ${getHighlightClass("operations")}`.trim()} onClick={() => toggleNavMenu("operations")}>
										Operations
									</button>
									<div className="app-menu-panel">
										<NavLink className={`app-menu-item ${getHighlightClass("operations-incidents")}`.trim()} data-tutorial-key="operations-incidents" to="/incidents" onClick={closeMobileMenu}>
											Case Records
										</NavLink>
										<NavLink className={`app-menu-item ${getHighlightClass("operations-home-visitation")}`.trim()} data-tutorial-key="operations-home-visitation" to="/home-visitation-conferences" onClick={closeMobileMenu}>
											Home Visitation &amp; Conferences
										</NavLink>
										<NavLink className={`app-menu-item ${getHighlightClass("operations-partners")}`.trim()} data-tutorial-key="operations-partners" to="/partners" onClick={closeMobileMenu}>
											Partners
										</NavLink>
										<NavLink className={`app-menu-item ${getHighlightClass("operations-process-recordings")}`.trim()} data-tutorial-key="operations-process-recordings" to="/process-recordings" onClick={closeMobileMenu}>
											Process Recordings
										</NavLink>
										<NavLink className={`app-menu-item ${getHighlightClass("operations-residents")}`.trim()} data-tutorial-key="operations-residents" to="/residents" onClick={closeMobileMenu}>
											Residents
										</NavLink>
										<NavLink className={`app-menu-item ${getHighlightClass("operations-safehouses")}`.trim()} data-tutorial-key="operations-safehouses" to="/safehouses" onClick={closeMobileMenu}>
											Safehouses
										</NavLink>
									</div>
								</div>
							) : null}

							{isAuthenticated && isAdmin ? (
								<div className={`app-menu-dropdown ${openNavMenu === "admin" ? "app-menu-dropdown-open" : ""}`}>
									<button type="button" data-tutorial-key="admin" className={`app-menu-summary ${getHighlightClass("admin")}`.trim()} onClick={() => toggleNavMenu("admin")}>
										Admin
									</button>
									<div className="app-menu-panel">
										<NavLink className={`app-menu-item ${getHighlightClass("admin-dashboard")}`.trim()} data-tutorial-key="admin-dashboard" to="/admin-dashboard" onClick={closeMobileMenu}>
											Admin Dashboard
										</NavLink>
										<NavLink className={`app-menu-item ${getHighlightClass("admin-campaign-analysis")}`.trim()} data-tutorial-key="admin-campaign-analysis" to="/campaign-analysis" onClick={closeMobileMenu}>
											Campaign Analysis
										</NavLink>
										<NavLink className={`app-menu-item ${getHighlightClass("admin-donations")}`.trim()} data-tutorial-key="admin-donations" to="/donations" onClick={closeMobileMenu}>
											Donations
										</NavLink>
										<NavLink className={`app-menu-item ${getHighlightClass("admin-reports")}`.trim()} data-tutorial-key="admin-reports" to="/admin-reports" onClick={closeMobileMenu}>
											Reports &amp; Analytics
										</NavLink>
										<NavLink className={`app-menu-item ${getHighlightClass("admin-users")}`.trim()} data-tutorial-key="admin-users" to="/users" onClick={closeMobileMenu}>
											Users
										</NavLink>
									</div>
								</div>
							) : null}
						</nav>

						<div className="app-auth-nav">
							{!isAuthenticated ? (
								<NavLink className={navClassName} to="/login" onClick={closeMobileMenu}>
									Login
								</NavLink>
							) : (
									<button type="button" data-tutorial-key="donate" className={`app-donate-btn ${getHighlightClass("donate")}`.trim()} onClick={openDonateModal}>
										Donate
									</button>
								)}

							{isAuthenticated && !isLoading ? (
								<details className="app-menu-dropdown app-profile-dropdown">
									<summary data-tutorial-key="profile" className={`app-profile-trigger ${getHighlightClass("profile")}`.trim()} aria-label="Open profile menu">
										<span className="app-profile-avatar">{profileInitial}</span>
									</summary>
									<div className="app-menu-panel app-profile-panel">
										<div className="app-profile-email">{authSession.email ?? "Signed-in user"}</div>
										{isAdmin ? (
											<button type="button" className="app-menu-item app-menu-item-accent text-start w-100" onClick={handleStartTutorial}>
												Tutorial
											</button>
										) : null}
										<NavLink className="app-menu-item" to="/mfa" onClick={closeMobileMenu}>
											MFA Settings
										</NavLink>
										<NavLink className="app-menu-item app-menu-item-danger" to="/logout" onClick={closeMobileMenu}>
											Logout
										</NavLink>
									</div>
								</details>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</header>
	);
}

export default Header;
