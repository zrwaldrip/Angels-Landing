import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { getAuthSession, loginUser } from "../lib/authAPI";
import { isAllowedReturnPath, resolveRoleHome } from "../routes/roleRouting";

function LoginPage() {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const { refreshAuthState } = useAuth();
	const [twoFactorCode, setTwoFactorCode] = useState("");
	const [recoveryCode, setRecoveryCode] = useState("");
	const [mfaRequired, setMfaRequired] = useState(false);
	const [showRecoveryInput, setShowRecoveryInput] = useState(false);
	const [mfaPromptMessage, setMfaPromptMessage] = useState("");
	const [rememberMe, setRememberMe] = useState(true);
	const [errorMessage, setErrorMessage] = useState(searchParams.get("externalError") ?? "");
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function waitForEstablishedSession(maxAttempts = 5, delayMs = 220) {
		let lastSession = await getAuthSession();
		if (lastSession.isAuthenticated) return lastSession;

		for (let attempt = 1; attempt < maxAttempts; attempt += 1) {
			await new Promise((resolve) => window.setTimeout(resolve, delayMs));
			await refreshAuthState();
			lastSession = await getAuthSession();
			if (lastSession.isAuthenticated) return lastSession;
		}

		return lastSession;
	}

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage("");
		setMfaPromptMessage("");
		setIsSubmitting(true);
		const formData = new FormData(event.currentTarget);
		const email = String(formData.get("email") ?? "").trim();
		const password = String(formData.get("password") ?? "");

		try {
			await loginUser(email, password, rememberMe, twoFactorCode || undefined, recoveryCode || undefined);
			await refreshAuthState();
			const session = await waitForEstablishedSession();
			if (!session.isAuthenticated) {
				throw new Error(
					"Sign-in completed, but a session cookie was not confirmed. On Safari, verify cross-site cookie settings and try again."
				);
			}
			const returnTo = searchParams.get("returnTo");

			if (isAllowedReturnPath(returnTo)) {
				navigate(returnTo, { replace: true });
				return;
			}

			const roleHome = resolveRoleHome(session);
			navigate(roleHome ?? "/unauthorized", { replace: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Unable to log in.";
			if (message.toLowerCase().includes("mfa is enabled")) {
				setMfaRequired(true);
				setShowRecoveryInput(false);
				setMfaPromptMessage(message);
				setErrorMessage("");
				return;
			}
			setErrorMessage(message);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="container mt-4">
			<Header />
			<div className="row justify-content-center">
				<div className="col-md-6 col-lg-5">
					<div className="card shadow-sm">
						<div className="card-body p-4">
							<h2 className="h4 mb-3">Login</h2>
							<p className="text-muted">
								Sign in to the Angels&apos; Landing portal.
							</p>
							{mfaPromptMessage ? (
								<div className="mfa-required-popup" role="status" aria-live="polite">
									<div className="mfa-required-popup-title">Authenticator MFA Required</div>
									<p className="mb-0">{mfaPromptMessage}</p>
								</div>
							) : null}
							<form onSubmit={handleSubmit}>
								<div className="mb-3">
									<label className="form-label" htmlFor="email">
										Email
									</label>
									<input id="email" name="email" type="email" className="form-control" autoComplete="username" required />
								</div>
								<div className="mb-3">
									<label className="form-label" htmlFor="password">
										Password
									</label>
									<input id="password" name="password" type="password" className="form-control" autoComplete="current-password" required />
								</div>
								{mfaRequired ? (
									<div className="mb-3">
										<label className="form-label" htmlFor="twoFactorCode">
											Authenticator code
										</label>
										<input
											id="twoFactorCode"
											name="twoFactorCode"
											type="text"
											className="form-control"
											inputMode="numeric"
											autoComplete="one-time-code"
											value={twoFactorCode}
											onChange={(e) => setTwoFactorCode(e.target.value)}
											required={!showRecoveryInput}
										/>
										<div className="form-text">Enter the 6-digit code from your authenticator app.</div>
									</div>
								) : null}
								<div className="form-check mb-3">
									<input
										id="rememberMe"
										name="rememberMe"
										type="checkbox"
										className="form-check-input"
										checked={rememberMe}
										onChange={(e) => setRememberMe(e.target.checked)}
									/>
									<label className="form-check-label" htmlFor="rememberMe">
										Remember me
									</label>
								</div>
								{errorMessage ? (
									<div className="alert alert-danger" role="alert">
										{errorMessage}
									</div>
								) : null}
								<button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
									{isSubmitting ? "Signing in..." : "Sign in"}
								</button>
							</form>
							<p className="mt-3 mb-0">
								Need an account? <Link to="/register">Register here</Link>.
							</p>
							{mfaRequired ? (
								<div className="mt-3">
									<span className="text-muted">Having trouble with your authenticator? </span>
									<button
										type="button"
										className="btn btn-link p-0 align-baseline"
										onClick={() => setShowRecoveryInput((current) => !current)}
									>
										Use a recovery code
									</button>
									<span className="text-muted">.</span>
								</div>
							) : null}
							{mfaRequired && showRecoveryInput ? (
								<div className="mt-2">
									<label className="form-label" htmlFor="recoveryCode">
										Recovery code
									</label>
									<input
										id="recoveryCode"
										name="recoveryCode"
										type="text"
										className="form-control"
										autoComplete="off"
										value={recoveryCode}
										onChange={(e) => setRecoveryCode(e.target.value)}
									/>
									<div className="form-text">Paste one of your backup recovery codes, then click Sign in.</div>
								</div>
							) : null}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

export default LoginPage;
