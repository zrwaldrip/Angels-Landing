import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import {
	getDonations,
	getInterventionPlans,
	getResidents,
	getSafehouses,
	type Donation,
	type InterventionPlan,
	type Resident,
	type Safehouse,
} from "../lib/lighthouseAPI";

function formatDate(value?: string) {
	if (!value) return "TBD";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString();
}

function AdminDashboardPage() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [safehouses, setSafehouses] = useState<Safehouse[]>([]);
	const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
	const [upcomingConferences, setUpcomingConferences] = useState<InterventionPlan[]>([]);
	const [allResidents, setAllResidents] = useState<Resident[]>([]);

	useEffect(() => {
		void loadDashboard();
	}, []);

	async function loadDashboard() {
		setLoading(true);
		setError("");
		try {
			const [safehouseData, donationData, interventionData, residentData] = await Promise.all([
				getSafehouses(),
				getDonations({ page: 1, pageSize: 5 }),
				getInterventionPlans(),
				getResidents({ page: 1, pageSize: 10000 }),
			]);
			setSafehouses(safehouseData);
			setRecentDonations(donationData.items ?? []);

			const today = new Date();
			const upcoming = interventionData
				.filter((plan) => {
					const targetDate = plan.targetDate ? new Date(plan.targetDate) : null;
					if (!targetDate || Number.isNaN(targetDate.getTime())) return false;
					return targetDate >= today && plan.status !== "Completed";
				})
				.sort((a, b) => new Date(a.targetDate ?? "").getTime() - new Date(b.targetDate ?? "").getTime())
				.slice(0, 5);
			setUpcomingConferences(upcoming);
			setAllResidents(residentData.items ?? []);
		} catch (loadError) {
			setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
		} finally {
			setLoading(false);
		}
	}

	const activeResidentsAcrossSafehouses = useMemo(
		() => safehouses.reduce((sum, safehouse) => sum + (safehouse.currentOccupancy ?? 0), 0),
		[safehouses]
	);

	const safehouseCapacityTotal = useMemo(
		() => safehouses.reduce((sum, safehouse) => sum + (safehouse.capacityGirls ?? 0), 0),
		[safehouses]
	);

	const occupancyRate = safehouseCapacityTotal > 0 ? (activeResidentsAcrossSafehouses / safehouseCapacityTotal) * 100 : 0;

	const highRiskResidents = useMemo(
		() => allResidents.filter((resident) => resident.currentRiskLevel === "High" || resident.currentRiskLevel === "Critical").length,
		[allResidents]
	);

	const activeCases = useMemo(
		() => allResidents.filter((resident) => resident.caseStatus === "Active").length,
		[allResidents]
	);

	return (
		<div className="container mt-4">
			<Header />
			<div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
				<h2 className="h4 mb-0">Admin Dashboard</h2>
				<span className="text-muted small mobile-page-subtitle">Operations command center</span>
			</div>

			<p className="text-muted mobile-page-subtitle">
				High-level view of daily operations: resident activity, recent donations, upcoming case conferences, and progress indicators.
			</p>

			{error ? <div className="alert alert-danger">{error}</div> : null}

			{loading ? (
				<div className="text-center py-4">
					<div className="spinner-border text-primary" role="status" />
				</div>
			) : (
				<>
					<div className="row g-3 mb-3">
						<div className="col-md-3">
							<div className="card h-100">
								<div className="card-body">
									<div className="text-muted small">Active Residents (Safehouses)</div>
									<div className="h3 mb-0">{activeResidentsAcrossSafehouses}</div>
								</div>
							</div>
						</div>
						<div className="col-md-3">
							<div className="card h-100">
								<div className="card-body">
									<div className="text-muted small">Occupancy Rate</div>
									<div className="h3 mb-0">{occupancyRate.toFixed(1)}%</div>
								</div>
							</div>
						</div>
						<div className="col-md-3">
							<div className="card h-100">
								<div className="card-body">
									<div className="text-muted small">Active Cases</div>
									<div className="h3 mb-0">{activeCases}</div>
								</div>
							</div>
						</div>
						<div className="col-md-3">
							<div className="card h-100">
								<div className="card-body">
									<div className="text-muted small">High/Critical Risk</div>
									<div className="h3 mb-0">{highRiskResidents}</div>
								</div>
							</div>
						</div>
					</div>

					<div className="row g-3 mb-3">
						<div className="col-lg-6">
							<div className="card h-100">
								<div className="card-body">
									<h3 className="h6 mb-3">Recent Donations</h3>
									{recentDonations.length === 0 ? (
										<div className="text-muted small">No recent donations available.</div>
									) : (
										<div className="table-responsive">
											<table className="table table-sm mb-0">
												<thead>
													<tr>
														<th>Date</th>
														<th>Type</th>
														<th>Amount</th>
														<th>Campaign</th>
													</tr>
												</thead>
												<tbody>
													{recentDonations.map((donation) => (
														<tr key={donation.donationId}>
															<td>{formatDate(donation.donationDate)}</td>
															<td>{donation.donationType ?? "N/A"}</td>
															<td>{donation.amount != null ? donation.amount.toFixed(2) : donation.estimatedValue?.toFixed(2) ?? "N/A"}</td>
															<td>{donation.campaignName || "—"}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							</div>
						</div>

						<div className="col-lg-6">
							<div className="card h-100">
								<div className="card-body">
									<h3 className="h6 mb-3">Upcoming Case Conferences</h3>
									{upcomingConferences.length === 0 ? (
										<div className="text-muted small">No upcoming case conferences found.</div>
									) : (
										<ul className="list-group list-group-flush">
											{upcomingConferences.map((plan) => (
												<li key={plan.planId} className="list-group-item px-0">
													<div className="fw-semibold">{plan.planCategory ?? "Case Conference"}</div>
													<div className="small text-muted">
														Resident #{plan.residentId ?? "N/A"} | Target: {formatDate(plan.targetDate)} | Status: {plan.status ?? "Planned"}
													</div>
												</li>
											))}
										</ul>
									)}
								</div>
							</div>
						</div>
					</div>

					<div className="card mb-4">
						<div className="card-body">
							<h3 className="h6 mb-3">Progress Snapshot</h3>
							<div className="row g-3">
								<div className="col-md-4">
									<div className="border rounded p-3 h-100">
										<div className="small text-muted">Open Safehouses</div>
										<div className="h5 mb-0">{safehouses.filter((safehouse) => safehouse.status === "Active").length}</div>
									</div>
								</div>
								<div className="col-md-4">
									<div className="border rounded p-3 h-100">
										<div className="small text-muted">Total Safehouse Capacity</div>
										<div className="h5 mb-0">{safehouseCapacityTotal}</div>
									</div>
								</div>
								<div className="col-md-4">
									<div className="border rounded p-3 h-100">
										<div className="small text-muted">Tracked Resident Records</div>
										<div className="h5 mb-0">{allResidents.length}</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}

export default AdminDashboardPage;
