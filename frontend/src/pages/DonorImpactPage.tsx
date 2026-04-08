import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { getDonorImpactSummary, type DonorImpactSummary } from "../lib/lighthouseAPI";
import { normalizeRoles } from "../routes/roleRouting";

function formatCurrencyPhp(value: number) {
	return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number) {
	return `${value.toFixed(1)}%`;
}

function DonorImpactPage() {
	const { authSession, isAuthenticated } = useAuth();
	const normalizedRoles = normalizeRoles(authSession.roles);
	const hasDonorPrivileges = isAuthenticated && (normalizedRoles.includes("donor") || normalizedRoles.includes("admin"));
	const donateLink = isAuthenticated ? "/donor-portal?donate=1" : "/login";

	const [summary, setSummary] = useState<DonorImpactSummary | null>(null);
	const [loadingSummary, setLoadingSummary] = useState(true);
	const [error, setError] = useState("");

	useEffect(() => {
		void loadSummary();
	}, []);

	async function loadSummary() {
		setLoadingSummary(true);
		setError("");
		try {
			const data = await getDonorImpactSummary();
			setSummary(data);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Unable to load donor impact summary.");
		} finally {
			setLoadingSummary(false);
		}
	}

	const reportText = useMemo(() => {
		if (!summary) return "";
		const lines = [
			`Organizational Impact Statement`,
			`Generated: ${new Date().toISOString()}`,
			"",
			`Total Lifetime Donations (PHP equivalent): ${formatCurrencyPhp(summary.personalContributionSummary.totalGivingLifetime)}`,
			`Recurring Donations: ${summary.personalContributionSummary.recurringStatus.recurringDonationCount}`,
			`Recurring Estimated Value: ${formatCurrencyPhp(summary.personalContributionSummary.recurringStatus.recurringEstimatedValue)}`,
			"",
			`Active Residents Supported: ${summary.organizationalImpact.activeResidents}`,
			`Reintegration Success Rate: ${formatPercent(summary.organizationalImpact.reintegrationSuccessRate)}`,
			`Educational Progress Avg: ${formatPercent(summary.organizationalImpact.educationalProgressAveragePercent)}`,
			`Health Goals Met: ${formatPercent(summary.organizationalImpact.healthWellbeingGoalsMetPercent)}`,
			"",
			`This Year Funding: ${formatCurrencyPhp(summary.connection.donorContributionThisYear)}`,
			`Counseling Month Equivalent (overall): ${summary.connection.counselingMonthsEquivalent.toFixed(2)}`,
			`Assumption: ${summary.connection.assumption}`,
			"",
			`Campaign Outcomes:`,
			...summary.connection.campaignOutcomes.map(
				(campaign) => `- ${campaign.campaignName}: ${formatCurrencyPhp(campaign.donorValue)} (share ${formatPercent(campaign.donorSharePercent)})`,
			),
			"",
			`Pipeline Placeholder: ${summary.reportPlaceholders.pipeline455}`,
		];
		return lines.join("\n");
	}, [summary]);

	return (
		<div className="container mt-4">
			<Header />
			<div className="d-flex justify-content-between align-items-center mb-3">
				<h2 className="h4 mb-0">Impact Overview</h2>
				<div className="d-flex gap-2">
					<button className="btn btn-outline-secondary btn-sm" onClick={() => void loadSummary()} disabled={loadingSummary}>
						Refresh
					</button>
					<Link to={donateLink} className="btn btn-primary btn-sm">
						Donate
					</Link>
				</div>
			</div>

			{error ? <div className="alert alert-danger">{error}</div> : null}

			{loadingSummary || !summary ? (
				<div className="text-center py-4">
					<div className="spinner-border text-primary" role="status" />
				</div>
			) : (
				<>
					<div className="card mb-3">
						<div className="card-body">
							<h3 className="h6 mb-3">1. Funding Summary</h3>
							<div className="row g-3">
								<div className="col-md-4">
									<div className="border rounded p-3 h-100">
										<div className="text-muted small">Total Donations (Lifetime)</div>
										<div className="h4 mb-0">{formatCurrencyPhp(summary.personalContributionSummary.totalGivingLifetime)}</div>
									</div>
								</div>
								<div className="col-md-4">
									<div className="border rounded p-3 h-100">
										<div className="text-muted small">Recurring Donations</div>
										<div className="h4 mb-0">{summary.personalContributionSummary.recurringStatus.recurringDonationCount}</div>
										<div className="small text-muted">
											{formatCurrencyPhp(summary.personalContributionSummary.recurringStatus.recurringEstimatedValue)} estimated value
										</div>
									</div>
								</div>
								<div className="col-md-4">
									<div className="border rounded p-3 h-100">
										<div className="text-muted small mb-2">Donation Mix</div>
										{summary.personalContributionSummary.donationMix.map((row) => (
											<div className="mb-2" key={row.donationType}>
												<div className="d-flex justify-content-between small">
													<span>{row.donationType}</span>
													<span>{formatPercent(row.percent)}</span>
												</div>
												<div className="progress" style={{ height: 8 }}>
													<div className="progress-bar" style={{ width: `${Math.max(0, Math.min(100, row.percent))}%` }} />
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>

					<div className="card mb-3">
						<div className="card-body">
							<h3 className="h6 mb-3">2. Organizational Impact</h3>
							<div className="row g-3">
								<div className="col-md-3">
									<div className="border rounded p-3">
										<div className="small text-muted">Active Residents</div>
										<div className="h5 mb-0">{summary.organizationalImpact.activeResidents}</div>
									</div>
								</div>
								<div className="col-md-3">
									<div className="border rounded p-3">
										<div className="small text-muted">Reintegration Success</div>
										<div className="h5 mb-0">{formatPercent(summary.organizationalImpact.reintegrationSuccessRate)}</div>
									</div>
								</div>
								<div className="col-md-3">
									<div className="border rounded p-3">
										<div className="small text-muted">Educational Progress</div>
										<div className="h5 mb-0">{formatPercent(summary.organizationalImpact.educationalProgressAveragePercent)}</div>
									</div>
								</div>
								<div className="col-md-3">
									<div className="border rounded p-3">
										<div className="small text-muted">Health Goals Met</div>
										<div className="h5 mb-0">{formatPercent(summary.organizationalImpact.healthWellbeingGoalsMetPercent)}</div>
									</div>
								</div>
							</div>
							{summary.organizationalImpact.latestPublishedSnapshot ? (
								<div className="alert alert-light border mt-3 mb-0">
									<div className="fw-semibold">
										{summary.organizationalImpact.latestPublishedSnapshot.headline ?? "Latest Published Snapshot"}
									</div>
									<div className="small text-muted">{summary.organizationalImpact.latestPublishedSnapshot.snapshotDate}</div>
									<div>{summary.organizationalImpact.latestPublishedSnapshot.summaryText}</div>
								</div>
							) : null}
						</div>
					</div>

					<div className="card mb-3">
						<div className="card-body">
							<h3 className="h6 mb-3">3. How Funding Supports Services</h3>
							<p className="mb-1">
								Total contributions this year are <strong>{formatCurrencyPhp(summary.connection.donorContributionThisYear)}</strong>.
							</p>
							<p className="mb-1">
								Equivalent support: <strong>{summary.connection.counselingMonthsEquivalent.toFixed(2)}</strong> counseling-months.
							</p>
							<p className="text-muted small">{summary.connection.assumption}</p>
							<div className="mt-2">
								<div className="small fw-semibold mb-2">Campaign-linked outcomes</div>
								{summary.connection.campaignOutcomes.length === 0 ? (
									<div className="text-muted small">No campaign-specific contributions yet.</div>
								) : (
									summary.connection.campaignOutcomes.map((campaign) => (
										<div className="border rounded p-2 mb-2 small" key={campaign.campaignName}>
											<div className="fw-semibold">{campaign.campaignName}</div>
											<div>
												Campaign funding: {formatCurrencyPhp(campaign.donorValue)} of {formatCurrencyPhp(campaign.campaignTotal)} campaign
												total ({formatPercent(campaign.donorSharePercent)}).
											</div>
										</div>
									))
								)}
							</div>
						</div>
					</div>

					<div className="card mb-3">
						<div className="card-body">
							<h3 className="h6 mb-3">4. Machine Learning Insights (Explanatory Model)</h3>
							<ul className="mb-2">
								{summary.explanatoryModel.topInsights.map((insight) => (
									<li key={insight}>{insight}</li>
								))}
							</ul>
							<div className="small text-muted">
								{summary.explanatoryModel.isPipelineBacked
									? "Insights are currently pipeline-backed."
									: `${summary.explanatoryModel.placeholder} (space reserved for pipeline outputs).`}
							</div>
						</div>
					</div>

					<div className="card mb-4">
						<div className="card-body">
							<h3 className="h6 mb-3">5. Interactive Elements</h3>
							{hasDonorPrivileges ? (
								<div className="d-flex gap-2 flex-wrap">
									<Link to={donateLink} className="btn btn-primary btn-sm">
										Donate
									</Link>
								</div>
							) : (
								<div className="d-flex gap-2 flex-wrap align-items-center">
									<Link to={donateLink} className="btn btn-primary btn-sm">
										Donate
									</Link>
									<span className="small text-muted">Sign in with a donor-enabled account to submit a donation.</span>
								</div>
							)}
							<div className="small text-muted mt-2">{summary.reportPlaceholders.pipeline455}</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

export default DonorImpactPage;
