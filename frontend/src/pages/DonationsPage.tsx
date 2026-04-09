import { useEffect, useState } from "react";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { getDonations, getSupporters, createDonation, updateDonation, deleteDonation, type Donation, type Supporter } from "../lib/lighthouseAPI";

const DONATION_TYPE_OPTIONS = ["Monetary", "InKind", "Time", "Skills", "SocialMedia"] as const;
const CHANNEL_OPTIONS = ["Campaign", "Event", "Direct", "SocialMedia", "PartnerReferral"] as const;
const CAMPAIGN_OPTIONS = ["", "Year-End Hope", "GivingTuesday", "Summer of Safety", "Back to School"] as const;

function isMonetaryType(type: string | undefined) {
	return type === "Monetary";
}

function DonationsPage() {
	const { authSession, isAuthenticated, isLoading } = useAuth();
	const isAdmin = authSession.roles.includes("Admin");

	const [donations, setDonations] = useState<Donation[]>([]);
	const [supporters, setSupporters] = useState<Supporter[]>([]);
	const [total, setTotal] = useState(0);
	const [page, setPage] = useState(1);
	const pageSize = 20;
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [showModal, setShowModal] = useState(false);
	const [editingDonation, setEditingDonation] = useState<Partial<Donation> | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState("");

	const [activeTab, setActiveTab] = useState<"donations" | "supporters">("donations");

	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			void loadDonations();
			void loadSupporters();
		}
	}, [isAuthenticated, isLoading, page]);

	async function loadDonations() {
		setLoading(true);
		setError("");
		try {
			const result = await getDonations({ page, pageSize });
			setDonations(result.items);
			setTotal(result.total);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to load donations.");
		} finally {
			setLoading(false);
		}
	}

	async function loadSupporters() {
		try {
			const result = await getSupporters({ page: 1, pageSize: 100 });
			setSupporters(result.items);
		} catch {
			/* ignore */
		}
	}

	function handleEdit(donation: Donation) {
		setEditingDonation({ ...donation });
		setSaveError("");
		setShowModal(true);
	}

	function handleNew() {
		setEditingDonation({
			donationType: "Monetary",
			donationDate: new Date().toISOString().slice(0, 10),
			currencyCode: "PHP",
			channelSource: "Direct",
			isRecurring: false,
		});
		setSaveError("");
		setShowModal(true);
	}

	async function handleSave() {
		if (!editingDonation) return;
		setSaving(true);
		setSaveError("");
		try {
			const donationType = String(editingDonation.donationType ?? "").trim();
			const amountRaw = String(editingDonation.amount ?? "").trim();
			const estimatedRaw = String(editingDonation.estimatedValue ?? "").trim();
			const amountValue = amountRaw.length > 0 ? Number(amountRaw) : undefined;
			const estimatedValue = estimatedRaw.length > 0 ? Number(estimatedRaw) : undefined;

			const payload: Partial<Donation> = {
				...editingDonation,
				supporterId: editingDonation.supporterId != null ? Number(editingDonation.supporterId) : undefined,
				donationType,
				donationDate: editingDonation.donationDate ? String(editingDonation.donationDate).trim() : undefined,
				channelSource: editingDonation.channelSource ? String(editingDonation.channelSource).trim() : undefined,
				campaignName: editingDonation.campaignName ? String(editingDonation.campaignName).trim() : undefined,
				currencyCode: editingDonation.currencyCode ? String(editingDonation.currencyCode).trim() : undefined,
				amount: amountValue,
				estimatedValue,
			};

			if (editingDonation.donationId) {
				await updateDonation(editingDonation.donationId, payload);
			} else {
				await createDonation(payload);
			}
			setShowModal(false);
			await loadDonations();
		} catch (e) {
			setSaveError(e instanceof Error ? e.message : "Failed to save.");
		} finally {
			setSaving(false);
		}
	}

	async function handleDelete(id: number) {
		if (!confirm("Delete this donation record?")) return;
		try {
			await deleteDonation(id);
			await loadDonations();
		} catch (e) {
			alert(e instanceof Error ? e.message : "Failed to delete.");
		}
	}

	const totalPages = Math.ceil(total / pageSize);

	return (
		<div className="container mt-4 donations-page">
			<Header />
			<div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
				<h2 className="h4 mb-0">Donations & Supporters</h2>
				{isAdmin && activeTab === "donations" && (
					<div className="mobile-page-actions">
						<button className="btn btn-primary btn-sm" onClick={handleNew}>
							+ Add Donation
						</button>
					</div>
				)}
			</div>

			<ul className="nav nav-tabs mb-3">
				<li className="nav-item">
					<button className={`nav-link ${activeTab === "donations" ? "active" : ""}`} onClick={() => setActiveTab("donations")}>
						Donations
					</button>
				</li>
				<li className="nav-item">
					<button className={`nav-link ${activeTab === "supporters" ? "active" : ""}`} onClick={() => setActiveTab("supporters")}>
						Supporters
					</button>
				</li>
			</ul>

			{error ? <div className="alert alert-danger">{error}</div> : null}

			{loading ? (
				<div className="text-center py-4">
					<div className="spinner-border text-primary" role="status" />
				</div>
			) : activeTab === "donations" ? (
				<>
					<div className="table-responsive">
						<table className="table table-sm table-hover">
							<thead className="table-light">
								<tr>
									<th>ID</th>
									<th>Supporter</th>
									<th>Type</th>
									<th>Date</th>
									<th>Amount</th>
									<th>Currency</th>
									<th>Channel</th>
									<th>Campaign</th>
									<th>Recurring</th>
									{isAdmin && <th>Actions</th>}
								</tr>
							</thead>
							<tbody>
								{donations.map((d) => (
									<tr key={d.donationId}>
										<td>{d.donationId}</td>
										<td>{d.supporterId}</td>
										<td>
											<span className="badge text-bg-info">{d.donationType}</span>
										</td>
										<td>{d.donationDate}</td>
										<td>{d.amount != null ? d.amount.toFixed(2) : d.estimatedValue?.toFixed(2)}</td>
										<td>{d.currencyCode}</td>
										<td>{d.channelSource}</td>
										<td>{d.campaignName}</td>
										<td>{d.isRecurring ? "✓" : ""}</td>
										{isAdmin && (
											<td>
												<button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEdit(d)}>
													Edit
												</button>
												<button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(d.donationId)}>
													Delete
												</button>
											</td>
										)}
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="d-flex justify-content-between align-items-center mt-2">
						<small className="text-muted">{total} donations total</small>
						<div className="d-flex gap-2">
							<button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
								Previous
							</button>
							<span className="btn btn-sm disabled">
								Page {page} of {totalPages}
							</span>
							<button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
								Next
							</button>
						</div>
					</div>
				</>
			) : (
				<div className="table-responsive">
					<table className="table table-sm table-hover">
						<thead className="table-light">
							<tr>
								<th>ID</th>
								<th>Display Name</th>
								<th>Type</th>
								<th>Email</th>
								<th>Region</th>
								<th>Country</th>
								<th>Status</th>
								<th>Channel</th>
							</tr>
						</thead>
						<tbody>
							{supporters.map((s) => (
								<tr key={s.supporterId}>
									<td>{s.supporterId}</td>
									<td>{s.displayName}</td>
									<td>{s.supporterType}</td>
									<td>{s.email}</td>
									<td>{s.region}</td>
									<td>{s.country}</td>
									<td>
										<span className={`badge ${s.status === "Active" ? "text-bg-success" : "text-bg-secondary"}`}>{s.status}</span>
									</td>
									<td>{s.acquisitionChannel}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Modal */}
			{showModal && editingDonation && (
				<div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
					<div className="modal-dialog">
						<div className="modal-content">
							<div className="modal-header">
								<h5 className="modal-title">{editingDonation.donationId ? "Edit Donation" : "Add Donation"}</h5>
								<button type="button" className="btn-close" onClick={() => setShowModal(false)} />
							</div>
							<div className="modal-body">
								{saveError ? <div className="alert alert-danger">{saveError}</div> : null}
								<div className="row g-3">
									<div className="col-md-6">
										<label className="form-label small">Supporter</label>
										<select
											className="form-select form-select-sm"
											value={String(editingDonation.supporterId ?? "")}
											onChange={(e) =>
												setEditingDonation((prev) => (prev ? { ...prev, supporterId: Number(e.target.value) || undefined } : prev))
											}
										>
											<option value="">Select supporter...</option>
											{supporters.map((s) => (
												<option key={s.supporterId} value={s.supporterId}>
													{s.supporterId} - {s.displayName ?? s.email ?? "Unnamed"}
												</option>
											))}
										</select>
									</div>
									<div className="col-md-6">
										<label className="form-label small">Type</label>
										<select
											className="form-select form-select-sm"
											value={String(editingDonation.donationType ?? "")}
											onChange={(e) => setEditingDonation((prev) => (prev ? { ...prev, donationType: e.target.value } : prev))}
										>
											{DONATION_TYPE_OPTIONS.map((type) => (
												<option key={type} value={type}>
													{type}
												</option>
											))}
										</select>
									</div>
									<div className="col-md-6">
										<label className="form-label small">Date</label>
										<input
											type="date"
											className="form-control form-control-sm"
											value={String(editingDonation.donationDate ?? "")}
											onChange={(e) => setEditingDonation((prev) => (prev ? { ...prev, donationDate: e.target.value } : prev))}
										/>
									</div>
									<div className="col-md-6">
										<label className="form-label small">Channel</label>
										<select
											className="form-select form-select-sm"
											value={String(editingDonation.channelSource ?? "")}
											onChange={(e) => setEditingDonation((prev) => (prev ? { ...prev, channelSource: e.target.value } : prev))}
										>
											{CHANNEL_OPTIONS.map((channel) => (
												<option key={channel} value={channel}>
													{channel}
												</option>
											))}
										</select>
									</div>
									<div className="col-md-6">
										<label className="form-label small">Campaign</label>
										<select
											className="form-select form-select-sm"
											value={String(editingDonation.campaignName ?? "")}
											onChange={(e) => setEditingDonation((prev) => (prev ? { ...prev, campaignName: e.target.value } : prev))}
										>
											{CAMPAIGN_OPTIONS.map((campaign) => (
												<option key={campaign || "none"} value={campaign}>
													{campaign || "No campaign"}
												</option>
											))}
										</select>
									</div>
									{isMonetaryType(editingDonation.donationType) ? (
										<>
											<div className="col-md-3">
												<label className="form-label small">Currency</label>
												<select
													className="form-select form-select-sm"
													value={String(editingDonation.currencyCode ?? "PHP")}
													onChange={(e) => setEditingDonation((prev) => (prev ? { ...prev, currencyCode: e.target.value } : prev))}
												>
													<option value="PHP">PHP</option>
													<option value="USD">USD</option>
												</select>
											</div>
											<div className="col-md-3">
												<label className="form-label small">Amount</label>
												<input
													type="number"
													min="0.01"
													step="0.01"
													className="form-control form-control-sm"
													value={String(editingDonation.amount ?? "")}
													onChange={(e) => setEditingDonation((prev) => (prev ? { ...prev, amount: Number(e.target.value) } : prev))}
												/>
											</div>
										</>
									) : (
										<div className="col-md-6">
											<label className="form-label small">Estimated Value</label>
											<input
												type="number"
												min="0.01"
												step="0.01"
												className="form-control form-control-sm"
												value={String(editingDonation.estimatedValue ?? "")}
												onChange={(e) =>
													setEditingDonation((prev) => (prev ? { ...prev, estimatedValue: Number(e.target.value) } : prev))
												}
											/>
										</div>
									)}
									<div className="col-md-6">
										<div className="form-check mt-4">
											<input
												id="adminRecurring"
												type="checkbox"
												className="form-check-input"
												checked={Boolean(editingDonation.isRecurring)}
												onChange={(e) => setEditingDonation((prev) => (prev ? { ...prev, isRecurring: e.target.checked } : prev))}
											/>
											<label className="form-check-label small" htmlFor="adminRecurring">
												Recurring donation
											</label>
										</div>
									</div>
									<div className="col-12">
										<label className="form-label small">Notes</label>
										<textarea
											className="form-control form-control-sm"
											rows={2}
											value={String(editingDonation.notes ?? "")}
											onChange={(e) => setEditingDonation((prev) => (prev ? { ...prev, notes: e.target.value } : prev))}
										/>
									</div>
								</div>
							</div>
							<div className="modal-footer">
								<button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
									Cancel
								</button>
								<button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
									{saving ? "Saving..." : "Save"}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export default DonationsPage;
