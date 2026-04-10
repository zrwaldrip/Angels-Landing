import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { getDonorImpactSummary, type DonorImpactSummary } from "../lib/lighthouseAPI";
import impactHeroPhoto from "../assets/images/photo6.jfif";

function formatCurrencyPhp(value: number) {
	return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number) {
	return `${value.toFixed(1)}%`;
}

function DonorImpactPage() {
	const { isAuthenticated } = useAuth();
	const donateLink = "/login";

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

	function handleDonateClick() {
		window.dispatchEvent(new Event("open-donate-modal"));
	}

	return (
		<div className="container mt-4 donor-impact-page donor-impact-redesign">
			<Header />

			{error ? <div className="alert alert-danger">{error}</div> : null}

			{loadingSummary || !summary ? (
				<div className="text-center py-4">
					<div className="spinner-border text-primary" role="status" />
				</div>
			) : (
				<>
					<section className="impact-hero mb-4">
						<div className="impact-hero-media" aria-hidden="true">
							<div className="impact-hero-media-blur" style={{ backgroundImage: `url(${impactHeroPhoto})` }} />
							<img src={impactHeroPhoto} alt="Residents and staff at Angels' Landing" className="impact-hero-photo" loading="eager" />
						</div>
						<div className="impact-hero-overlay" />
						<div className="impact-hero-content">
							<div className="impact-hero-kicker">Angels&apos; Landing Impact</div>
							<h2 className="impact-hero-title">Your support keeps girls in the Philippines safe from sexual abuse and housed in long-term safehouses.</h2>
							<p className="impact-hero-copy mb-0">
								Every gift strengthens sanctuary operations, trauma recovery, and long-term reintegration for girls who have survived
								sexual abuse. This is direct intervention, measured in real outcomes and protected lives.
							</p>
							<div className="impact-hero-actions mt-3">
								{isAuthenticated ? (
									<button type="button" className="btn btn-primary donor-impact-mobile-donate-btn" onClick={handleDonateClick}>
										Donate Now
									</button>
								) : (
									<Link to={donateLink} className="btn btn-primary donor-impact-mobile-donate-btn">
										Donate Now
									</Link>
								)}
							</div>
						</div>
					</section>

					<section className="impact-story-intro mb-3">
						<h3 className="impact-section-title mb-1">1) What You Have Powered</h3>
						<p className="impact-section-copy mb-0">
							Your contributions fund secure shelter, trained staff, and immediate protection for girls facing abuse-related danger.
						</p>
					</section>

					<section className="row g-3 mb-3">
						<div className="col-lg-8">
							<div className="impact-panel impact-panel-primary h-100">
								<p className="impact-panel-label mb-2">Total Donations (Lifetime)</p>
								<div className="impact-panel-value">{formatCurrencyPhp(summary.personalContributionSummary.totalGivingLifetime)}</div>
								<p className="impact-panel-note mb-0">Directly powering safehouse protection, survivor care, and reintegration services.</p>
							</div>
						</div>
						<div className="col-lg-4">
							<div className="impact-panel h-100">
								<p className="impact-panel-label mb-2">Recurring Donations</p>
								<div className="impact-panel-value impact-panel-value-sm">{summary.personalContributionSummary.recurringStatus.recurringDonationCount}</div>
								<p className="impact-panel-note mb-0">
									{formatCurrencyPhp(summary.personalContributionSummary.recurringStatus.recurringEstimatedValue)} in sustained support for safehouse operations.
								</p>
							</div>
						</div>
					</section>

					<section className="impact-story-intro mb-3">
						<h3 className="impact-section-title mb-1">2) How Support Turns Into Services</h3>
						<p className="impact-section-copy mb-0">
							Funding moves urgently into safehouse staffing, trauma counseling, daily essentials, and coordinated survivor protection.
						</p>
					</section>

					<section className="row g-3 mb-3">
						<div className="col-lg-5">
							<div className="card h-100 impact-card">
								<div className="card-body">
									<h3 className="h6 mb-3">How Contributions Become Care</h3>
									<p className="mb-2">
										This year, contributions total <strong>{formatCurrencyPhp(summary.connection.donorContributionThisYear)}</strong> for direct safehouse intervention.
									</p>
									<p className="mb-2">
										Equivalent counseling support delivered: <strong>{summary.connection.counselingMonthsEquivalent.toFixed(2)}</strong> counseling-months for survivors.
									</p>
									<p className="small text-muted mb-0">{summary.connection.assumption}</p>
								</div>
							</div>
						</div>
						<div className="col-lg-7">
							<div className="card h-100 impact-card">
								<div className="card-body">
									<h3 className="h6 mb-3">Donation Mix</h3>
									<div className="d-flex flex-column gap-3">
										{summary.personalContributionSummary.donationMix.map((row) => (
											<div key={row.donationType}>
													<div className="d-flex justify-content-between impact-mix-row mb-1">
														<span className="impact-mix-label">{row.donationType}</span>
														<span className="impact-mix-percent">{formatPercent(row.percent)}</span>
												</div>
												<div className="impact-progress">
													<div className="impact-progress-fill" style={{ width: `${Math.max(0, Math.min(100, row.percent))}%` }} role="presentation" />
												</div>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</section>

					<section className="impact-story-intro mb-3">
						<h3 className="impact-section-title mb-1">3) Results For Residents</h3>
						<p className="impact-section-copy mb-0">
							These outcomes show how girls in our safehouses move from crisis and trauma toward stability, healing, and independence.
						</p>
					</section>

					<section className="card mb-3 impact-card">
						<div className="card-body">
							<h3 className="h6 mb-3">Program Outcomes</h3>
							<div className="row g-3">
								<div className="col-md-3 col-6">
									<div className="impact-outcome-tile">
										<div className="impact-outcome-number">{summary.organizationalImpact.activeResidents}</div>
										<div className="impact-outcome-label">Active Residents</div>
									</div>
								</div>
								<div className="col-md-3 col-6">
									<div className="impact-outcome-tile">
										<div className="impact-outcome-number">{formatPercent(summary.organizationalImpact.reintegrationSuccessRate)}</div>
										<div className="impact-outcome-label">Reintegration Success</div>
									</div>
								</div>
								<div className="col-md-3 col-6">
									<div className="impact-outcome-tile">
										<div className="impact-outcome-number">{formatPercent(summary.organizationalImpact.educationalProgressAveragePercent)}</div>
										<div className="impact-outcome-label">Educational Progress</div>
									</div>
								</div>
								<div className="col-md-3 col-6">
									<div className="impact-outcome-tile">
										<div className="impact-outcome-number">{formatPercent(summary.organizationalImpact.healthWellbeingGoalsMetPercent)}</div>
										<div className="impact-outcome-label">Health Goals Met</div>
									</div>
								</div>
							</div>
						</div>
					</section>

					<section className="impact-story-intro mb-3">
						<h3 className="impact-section-title mb-1">4) Where Momentum Is Building</h3>
						<p className="impact-section-copy mb-0">
							Campaign trends and program insights show where your next gift can protect more girls from sexual abuse and expand safehouse capacity.
						</p>
					</section>

					<section className="row g-3 mb-3">
						<div className="col-lg-7">
							<div className="card h-100 impact-card">
								<div className="card-body">
									<h3 className="h6 mb-3">Campaign-linked Outcomes</h3>
									{summary.connection.campaignOutcomes.length === 0 ? (
										<div className="text-muted small">No campaign-specific contributions yet.</div>
									) : (
										<div className="impact-campaign-grid">
											{summary.connection.campaignOutcomes.map((campaign) => (
												<div className="impact-campaign-item" key={campaign.campaignName}>
													<div className="fw-semibold">{campaign.campaignName}</div>
													<div className="small">
														{formatCurrencyPhp(campaign.donorValue)} raised out of {formatCurrencyPhp(campaign.campaignTotal)} total.
													</div>
													<div className="small text-muted">{formatPercent(campaign.donorSharePercent)} donor share</div>
												</div>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
						<div className="col-lg-5">
							<div className="card h-100 impact-card">
								<div className="card-body">
									<h3 className="h6 mb-3">Insights</h3>
									<ul className="impact-insights-list mb-3">
										{summary.explanatoryModel.topInsights.map((insight) => (
											<li key={insight}>{insight}</li>
										))}
									</ul>
									<div className="small text-muted">
										{summary.explanatoryModel.isPipelineBacked
											? "Insights are pipeline-backed."
											: `${summary.explanatoryModel.placeholder} (space reserved for pipeline outputs).`}
									</div>
								</div>
							</div>
						</div>
					</section>

				</>
			)}
		</div>
	);
}

export default DonorImpactPage;
