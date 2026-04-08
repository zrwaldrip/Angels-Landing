import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { normalizeRoles } from "../routes/roleRouting";

function Header() {
	const { authSession, isAuthenticated, isLoading } = useAuth();
	const normalizedRoles = normalizeRoles(authSession.roles);
	const isAdmin = normalizedRoles.includes("admin");
	const isDonor = normalizedRoles.includes("donor");
	const hasDonorPrivileges = isDonor || isAdmin;
	const isDonorOnly = isAuthenticated && isDonor && !isAdmin;
	const navClassName = ({ isActive }: { isActive: boolean }) => `app-header-link ${isActive ? "app-header-link-active" : ""}`;

	const statusText = isLoading
		? "Checking sign-in…"
		: isAuthenticated
			? `Signed in as ${authSession.userName ?? authSession.email ?? "user"}`
			: "Not signed in";

	const statusClassName = `badge ${isLoading ? "bg-secondary" : isAuthenticated ? "bg-success" : "bg-warning text-dark"}`;

	return (
		<header className="app-header fixed-top bg-primary text-white">
			<div className="container py-3">
				<div className="app-header-inner">
					<NavLink to="/" className="app-brand text-white text-decoration-none">
						<h1 className="h4 mb-0 fw-bold">Angels' Landing</h1>
					</NavLink>

					<nav className="app-main-nav d-flex gap-3 flex-wrap">
						{isAuthenticated && (
							<>
								{isDonorOnly ? (
									<>
										<NavLink className={navClassName + " text-white text-decoration-none"} to="/donor-portal">
											Donor Portal
										</NavLink>
										<NavLink className={navClassName + " text-white text-decoration-none"} to="/donor-impact">
											Donor Impact
										</NavLink>
									</>
								) : (
									<>
										<NavLink className={navClassName + " text-white text-decoration-none"} to="/residents">
											Residents
										</NavLink>
										<NavLink className={navClassName + " text-white text-decoration-none"} to="/safehouses">
											Safehouses
										</NavLink>
										<NavLink className={navClassName + " text-white text-decoration-none"} to="/donations">
											Donations
										</NavLink>
										<NavLink className={navClassName + " text-white text-decoration-none"} to="/incidents">
											Case Records
										</NavLink>
										{isAdmin ? (
											<NavLink className={navClassName + " text-white text-decoration-none"} to="/users">
												Users
											</NavLink>
										) : null}
									</>
								)}
							</>
						)}
						{!isDonorOnly ? (
							<NavLink className={navClassName + " text-white text-decoration-none"} to="/cookies">
								Cookies
							</NavLink>
						) : null}
					</nav>

					<div className="app-auth-nav d-flex gap-3 justify-content-lg-end align-items-center flex-wrap">
						<span className={`${statusClassName} app-status-badge`}>{statusText}</span>
						{!isAuthenticated ? (
							<>
								<NavLink className={navClassName + " text-white text-decoration-none"} to="/login">
									Login
								</NavLink>
								<NavLink className={navClassName + " text-white text-decoration-none"} to="/register">
									Register
								</NavLink>
							</>
						) : (
							<>
								{hasDonorPrivileges ? (
									<NavLink className="btn btn-light btn-sm text-primary" to="/donor-portal?donate=1">
										Donate
									</NavLink>
								) : null}
								<NavLink className={navClassName + " text-white text-decoration-none"} to="/mfa">
									MFA
								</NavLink>
								<NavLink className={navClassName + " text-white text-decoration-none"} to="/logout">
									Logout
								</NavLink>
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
}

export default Header;
