import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { normalizeRoles } from "../routes/roleRouting";

function Header() {
	const { authSession, isAuthenticated, isLoading } = useAuth();
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [openNavMenu, setOpenNavMenu] = useState<"operations" | "admin" | null>(null);
	const navMenusRef = useRef<HTMLDivElement | null>(null);
	const normalizedRoles = normalizeRoles(authSession.roles);
	const isAdmin = normalizedRoles.includes("admin");
	const isDonor = normalizedRoles.includes("donor");
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

	function toggleNavMenu(menu: "operations" | "admin") {
		setOpenNavMenu((prev) => (prev === menu ? null : menu));
	}

	function openDonateModal() {
		closeMobileMenu();
		window.dispatchEvent(new Event("open-donate-modal"));
	}

	return (
		<header className="app-header fixed-top">
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
							<NavLink className={navClassName} to="/" onClick={closeMobileMenu}>
								Home
							</NavLink>
							<NavLink className={navClassName} to="/donor-impact" onClick={closeMobileMenu}>
								Impact
							</NavLink>
							{isAuthenticated && isDonor ? (
								<NavLink className={navClassName} to="/donor-portal" onClick={closeMobileMenu}>
									Donor Portal
								</NavLink>
							) : null}

							{isAuthenticated && isAdmin ? (
								<div
									className={`app-menu-dropdown ${openNavMenu === "operations" ? "app-menu-dropdown-open" : ""}`}
								>
									<button type="button" className="app-menu-summary" onClick={() => toggleNavMenu("operations")}>
										Operations
									</button>
									<div className="app-menu-panel">
										<NavLink className="app-menu-item" to="/residents" onClick={closeMobileMenu}>
											Residents
										</NavLink>
										<NavLink className="app-menu-item" to="/safehouses" onClick={closeMobileMenu}>
											Safehouses
										</NavLink>
										<NavLink className="app-menu-item" to="/incidents" onClick={closeMobileMenu}>
											Case Records
										</NavLink>
									</div>
								</div>
							) : null}

							{isAuthenticated && isAdmin ? (
								<div
									className={`app-menu-dropdown ${openNavMenu === "admin" ? "app-menu-dropdown-open" : ""}`}
								>
									<button type="button" className="app-menu-summary" onClick={() => toggleNavMenu("admin")}>
										Admin
									</button>
									<div className="app-menu-panel">
										<NavLink className="app-menu-item" to="/users" onClick={closeMobileMenu}>
											Users
										</NavLink>
										<NavLink className="app-menu-item" to="/donations" onClick={closeMobileMenu}>
											Donations
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
							) : isDonor ? (
									<button type="button" className="app-donate-btn" onClick={openDonateModal}>
										Donate
									</button>
								) : null}

							{isAuthenticated && !isLoading ? (
								<details className="app-menu-dropdown app-profile-dropdown">
									<summary className="app-profile-trigger" aria-label="Open profile menu">
										<span className="app-profile-avatar">{profileInitial}</span>
									</summary>
									<div className="app-menu-panel app-profile-panel">
										<div className="app-profile-email">{authSession.email ?? "Signed-in user"}</div>
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
