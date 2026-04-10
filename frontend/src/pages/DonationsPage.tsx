import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { getDonations, getSupporters, createDonation, updateDonation, deleteDonation, createSupporter, updateSupporter, deleteSupporter, type Donation, type Supporter } from "../lib/lighthouseAPI";

const DONATION_TYPE_OPTIONS = ["Monetary", "InKind", "Time", "Skills", "SocialMedia"] as const;
const CHANNEL_OPTIONS = ["Campaign", "Event", "Direct", "SocialMedia", "PartnerReferral"] as const;
const CAMPAIGN_OPTIONS = ["", "Year-End Hope", "GivingTuesday", "Summer of Safety", "Back to School"] as const;
const IMPACT_UNIT_OPTIONS = ["pesos", "items", "hours", "campaigns"] as const;

function isMonetaryType(type: string | undefined) {
	return type === "Monetary";
}

function PropensityHeader({
	onSort,
	indicator,
}: {
	onSort: () => void;
	indicator: string;
}) {
	const [visible, setVisible] = useState(false);
	const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
	const tooltipWidth = 320;

	function show(e: React.MouseEvent<HTMLSpanElement>) {
		const rect = e.currentTarget.getBoundingClientRect();
		const margin = 8;
		const top = Math.min(rect.bottom + margin, window.innerHeight - margin);
		const left = Math.min(Math.max(rect.left, margin), window.innerWidth - tooltipWidth - margin);
		setPos({ top, left });
		setVisible(true);
	}

	function hide() {
		setVisible(false);
	}

	return (
		<th role="button" onClick={onSort} style={{ whiteSpace: "nowrap" }}>
			<span
				onMouseEnter={show}
				onMouseLeave={hide}
				style={{
					cursor: "help",
					borderBottom: "1px dotted rgba(255,255,255,0.45)",
					paddingBottom: 1,
				}}
			>
				Propensity ⓘ{indicator}
			</span>
			{visible && pos && (
				<div
					style={{
						position: "fixed",
						top: pos.top,
						left: pos.left,
						zIndex: 2000,
						width: tooltipWidth,
						maxWidth: tooltipWidth,
						background: "rgba(20, 24, 38, 0.97)",
						border: "1px solid rgba(255,255,255,0.14)",
						borderRadius: 8,
						padding: "10px 14px",
						fontSize: 12,
						lineHeight: 1.55,
						color: "rgba(255,255,255,0.92)",
						boxShadow: "0 8px 28px rgba(0,0,0,0.55)",
						pointerEvents: "none",
						whiteSpace: "normal",
						overflowWrap: "anywhere",
						wordBreak: "break-word",
					}}
				>
					<strong style={{ color: "rgba(116, 192, 252, 0.95)" }}>Likelihood to donate again</strong>
					<br />
					Estimated chance this supporter will donate again in the next 90 days. Higher scores help prioritize
					outreach when staff time is limited.
				</div>
			)}
		</th>
	);
}

function DonationsPage() {
	const { authSession, isAuthenticated, isLoading } = useAuth();
	const isAdmin = authSession.roles.includes("Admin");

	const [donations, setDonations] = useState<Donation[]>([]);
	const [supporters, setSupporters] = useState<Supporter[]>([]);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(10);
	const [search, setSearch] = useState("");
	const [selectedDonationTypes, setSelectedDonationTypes] = useState<string[]>([]);
	const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
	const [selectedRecurringFlags, setSelectedRecurringFlags] = useState<string[]>([]);
	const [sortKey, setSortKey] = useState<"donationId" | "supporterId" | "donationType" | "donationDate" | "amount" | "currencyCode" | "channelSource" | "campaignName" | "isRecurring">("donationDate");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [supporterSortKey, setSupporterSortKey] = useState<"supporterId" | "displayName" | "supporterType" | "email" | "region" | "country" | "status" | "acquisitionChannel" | "propensityScore">("supporterId");
	const [supporterSortDirection, setSupporterSortDirection] = useState<"asc" | "desc">("asc");
	const [supporterPage, setSupporterPage] = useState(1);
	const [supporterPageSize, setSupporterPageSize] = useState(10);
	const [supporterSearch, setSupporterSearch] = useState("");
	const [selectedSupporterTypes, setSelectedSupporterTypes] = useState<string[]>([]);
	const [selectedSupporterStatuses, setSelectedSupporterStatuses] = useState<string[]>([]);
	const [selectedSupporterChannels, setSelectedSupporterChannels] = useState<string[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const [showModal, setShowModal] = useState(false);
	const [editingDonation, setEditingDonation] = useState<Partial<Donation> | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState("");

	const [showSupporterModal, setShowSupporterModal] = useState(false);
	const [editingSupporter, setEditingSupporter] = useState<Partial<Supporter> | null>(null);
	const [savingSupporter, setSavingSupporter] = useState(false);
	const [saveSupporterError, setSaveSupporterError] = useState("");

	const [activeTab, setActiveTab] = useState<"donations" | "supporters">("donations");

	useEffect(() => {
		if (!isLoading && isAuthenticated) {
			void loadDonations();
			void loadSupporters();
		}
	}, [isAuthenticated, isLoading]);

	async function loadDonations() {
		setLoading(true);
		setError("");
		try {
			const result = await getDonations({ page: 1, pageSize: 1000 });
			setDonations(result.items);
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

	function handleEditSupporter(supporter: Supporter) {
		setEditingSupporter({ ...supporter });
		setSaveSupporterError("");
		setShowSupporterModal(true);
	}

	function handleNewSupporter() {
		setEditingSupporter({});
		setSaveSupporterError("");
		setShowSupporterModal(true);
	}

	async function handleSaveSupporter() {
		if (!editingSupporter) return;
		setSavingSupporter(true);
		setSaveSupporterError("");
		try {
			if (editingSupporter.supporterId) {
				await updateSupporter(editingSupporter.supporterId, editingSupporter);
			} else {
				await createSupporter(editingSupporter);
			}
			setShowSupporterModal(false);
			await loadSupporters();
		} catch (e) {
			setSaveSupporterError(e instanceof Error ? e.message : "Failed to save.");
		} finally {
			setSavingSupporter(false);
		}
	}

	async function handleDeleteSupporter(id: number) {
		if (!confirm("Delete this supporter?")) return;
		try {
			await deleteSupporter(id);
			await loadSupporters();
		} catch (e) {
			alert(e instanceof Error ? e.message : "Failed to delete.");
		}
	}

	const donationTypeOptions = useMemo(
		() => Array.from(new Set(donations.map((d) => d.donationType).filter((value): value is string => Boolean(value && value.trim())))).sort(),
		[donations]
	);
	const channelOptions = useMemo(
		() => Array.from(new Set(donations.map((d) => d.channelSource).filter((value): value is string => Boolean(value && value.trim())))).sort(),
		[donations]
	);
	const supporterTypeOptions = useMemo(
		() => Array.from(new Set(supporters.map((s) => s.supporterType).filter((value): value is string => Boolean(value && value.trim())))).sort(),
		[supporters]
	);
	const supporterStatusOptions = useMemo(
		() => Array.from(new Set(supporters.map((s) => s.status).filter((value): value is string => Boolean(value && value.trim())))).sort(),
		[supporters]
	);
	const supporterChannelOptions = useMemo(
		() => Array.from(new Set(supporters.map((s) => s.acquisitionChannel).filter((value): value is string => Boolean(value && value.trim())))).sort(),
		[supporters]
	);

	function toggleSelection(setter: (updater: (prev: string[]) => string[]) => void, value: string) {
		setter((prev) => (prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]));
	}

	function amountValue(donation: Donation) {
		return donation.amount ?? donation.estimatedValue ?? 0;
	}

	const filteredDonations = useMemo(() => {
		const query = search.trim().toLowerCase();
		return donations.filter((donation) => {
			const searchMatch = !query || [
				String(donation.donationId),
				String(donation.supporterId),
				donation.donationType,
				donation.channelSource,
				donation.campaignName,
				donation.currencyCode,
			].some((value) => String(value ?? "").toLowerCase().includes(query));
			const typeMatch = selectedDonationTypes.length === 0 || selectedDonationTypes.includes(donation.donationType ?? "");
			const channelMatch = selectedChannels.length === 0 || selectedChannels.includes(donation.channelSource ?? "");
			const recurringBucket = donation.isRecurring ? "recurring" : "oneTime";
			const recurringMatch = selectedRecurringFlags.length === 0 || selectedRecurringFlags.includes(recurringBucket);
			return searchMatch && typeMatch && channelMatch && recurringMatch;
		});
	}, [donations, search, selectedDonationTypes, selectedChannels, selectedRecurringFlags]);

	const sortedDonations = useMemo(() => {
		const dir = sortDirection === "asc" ? 1 : -1;
		return [...filteredDonations].sort((a, b) => {
			let av: string | number = "";
			let bv: string | number = "";
			switch (sortKey) {
				case "donationId":
					av = a.donationId ?? 0; bv = b.donationId ?? 0; break;
				case "supporterId":
					av = a.supporterId ?? 0; bv = b.supporterId ?? 0; break;
				case "donationType":
					av = String(a.donationType ?? "").toLowerCase(); bv = String(b.donationType ?? "").toLowerCase(); break;
				case "donationDate":
					av = Date.parse(String(a.donationDate ?? "")) || 0; bv = Date.parse(String(b.donationDate ?? "")) || 0; break;
				case "amount":
					av = amountValue(a); bv = amountValue(b); break;
				case "currencyCode":
					av = String(a.currencyCode ?? "").toLowerCase(); bv = String(b.currencyCode ?? "").toLowerCase(); break;
				case "channelSource":
					av = String(a.channelSource ?? "").toLowerCase(); bv = String(b.channelSource ?? "").toLowerCase(); break;
				case "campaignName":
					av = String(a.campaignName ?? "").toLowerCase(); bv = String(b.campaignName ?? "").toLowerCase(); break;
				case "isRecurring":
					av = a.isRecurring ? 1 : 0; bv = b.isRecurring ? 1 : 0; break;
				default:
					av = 0; bv = 0;
			}
			if (av < bv) return -1 * dir;
			if (av > bv) return 1 * dir;
			return 0;
		});
	}, [filteredDonations, sortKey, sortDirection]);

	const totalPages = Math.max(1, Math.ceil(sortedDonations.length / pageSize));
	const pagedDonations = useMemo(() => {
		const start = (page - 1) * pageSize;
		return sortedDonations.slice(start, start + pageSize);
	}, [sortedDonations, page, pageSize]);

	useEffect(() => {
		setPage(1);
	}, [search, selectedDonationTypes, selectedChannels, selectedRecurringFlags, pageSize]);

	useEffect(() => {
		if (page > totalPages) setPage(totalPages);
	}, [page, totalPages]);

	function toggleSort(key: typeof sortKey) {
		if (sortKey === key) {
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
			return;
		}
		setSortKey(key);
		setSortDirection("asc");
	}

	function sortIndicator(key: typeof sortKey) {
		if (sortKey !== key) return "";
		return sortDirection === "asc" ? " ▲" : " ▼";
	}

	const filteredSupporters = useMemo(() => {
		const query = supporterSearch.trim().toLowerCase();
		return supporters.filter((supporter) => {
			const searchMatch = !query || [
				String(supporter.supporterId),
				supporter.displayName,
				supporter.email,
				supporter.region,
				supporter.country,
				supporter.supporterType,
				supporter.status,
				supporter.acquisitionChannel,
			].some((value) => String(value ?? "").toLowerCase().includes(query));
			const typeMatch = selectedSupporterTypes.length === 0 || selectedSupporterTypes.includes(supporter.supporterType ?? "");
			const statusMatch = selectedSupporterStatuses.length === 0 || selectedSupporterStatuses.includes(supporter.status ?? "");
			const channelMatch = selectedSupporterChannels.length === 0 || selectedSupporterChannels.includes(supporter.acquisitionChannel ?? "");
			return searchMatch && typeMatch && statusMatch && channelMatch;
		});
	}, [supporters, supporterSearch, selectedSupporterTypes, selectedSupporterStatuses, selectedSupporterChannels]);

	const sortedSupporters = useMemo(() => {
		const dir = supporterSortDirection === "asc" ? 1 : -1;
		return [...filteredSupporters].sort((a, b) => {
			let av: string | number = "";
			let bv: string | number = "";
			switch (supporterSortKey) {
				case "supporterId":
					av = a.supporterId ?? 0; bv = b.supporterId ?? 0; break;
				case "displayName":
					av = String(a.displayName ?? "").toLowerCase(); bv = String(b.displayName ?? "").toLowerCase(); break;
				case "supporterType":
					av = String(a.supporterType ?? "").toLowerCase(); bv = String(b.supporterType ?? "").toLowerCase(); break;
				case "email":
					av = String(a.email ?? "").toLowerCase(); bv = String(b.email ?? "").toLowerCase(); break;
				case "region":
					av = String(a.region ?? "").toLowerCase(); bv = String(b.region ?? "").toLowerCase(); break;
				case "country":
					av = String(a.country ?? "").toLowerCase(); bv = String(b.country ?? "").toLowerCase(); break;
				case "status":
					av = String(a.status ?? "").toLowerCase(); bv = String(b.status ?? "").toLowerCase(); break;
				case "acquisitionChannel":
					av = String(a.acquisitionChannel ?? "").toLowerCase(); bv = String(b.acquisitionChannel ?? "").toLowerCase(); break;
				case "propensityScore":
					av = a.propensityScore ?? -1; bv = b.propensityScore ?? -1; break;
			}
			if (av < bv) return -1 * dir;
			if (av > bv) return 1 * dir;
			return 0;
		});
	}, [filteredSupporters, supporterSortDirection, supporterSortKey]);

	const supporterTotalPages = Math.max(1, Math.ceil(sortedSupporters.length / supporterPageSize));
	const pagedSupporters = useMemo(() => {
		const start = (supporterPage - 1) * supporterPageSize;
		return sortedSupporters.slice(start, start + supporterPageSize);
	}, [sortedSupporters, supporterPage, supporterPageSize]);

	function toggleSupporterSort(key: typeof supporterSortKey) {
		if (supporterSortKey === key) {
			setSupporterSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
			return;
		}
		setSupporterSortKey(key);
		setSupporterSortDirection("asc");
	}

	function supporterSortIndicator(key: typeof supporterSortKey) {
		if (supporterSortKey !== key) return "";
		return supporterSortDirection === "asc" ? " ▲" : " ▼";
	}

	useEffect(() => {
		setSupporterPage(1);
	}, [supporterSearch, selectedSupporterTypes, selectedSupporterStatuses, selectedSupporterChannels, supporterPageSize]);

	useEffect(() => {
		if (supporterPage > supporterTotalPages) setSupporterPage(supporterTotalPages);
	}, [supporterPage, supporterTotalPages]);

	return (
		<div className="container mt-4 donations-page">
			<Header />
			<div className="d-flex align-items-center justify-content-between mb-3 mobile-page-header">
				<h2 className="h4 mb-0">Donations & Supporters</h2>
				{isAdmin && (
					<div className="mobile-page-actions">
						{activeTab === "donations" ? (
							<button className="btn btn-primary btn-sm" onClick={handleNew}>
								+ Add Donation
							</button>
						) : (
							<button className="btn btn-primary btn-sm" onClick={handleNewSupporter}>
								+ Add Supporter
							</button>
						)}
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
				<div className="row g-3">
					<div className="col-lg-3">
						<div className="card shadow-sm">
							<div className="card-body">
								<h6 className="mb-3">Filters</h6>
								<label className="form-label small mb-1">Search</label>
								<input
									type="text"
									className="form-control form-control-sm mb-3"
									placeholder="ID, supporter, type, channel..."
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
								<div className="small text-muted fw-semibold mb-1">Donation Type</div>
								<div className="mb-3">
									{donationTypeOptions.map((option) => (
										<div className="form-check" key={`type-${option}`}>
											<input className="form-check-input" type="checkbox" id={`type-${option}`} checked={selectedDonationTypes.includes(option)} onChange={() => toggleSelection(setSelectedDonationTypes, option)} />
											<label className="form-check-label small" htmlFor={`type-${option}`}>{option}</label>
										</div>
									))}
								</div>
								<div className="small text-muted fw-semibold mb-1">Channel</div>
								<div className="mb-3">
									{channelOptions.map((option) => (
										<div className="form-check" key={`channel-${option}`}>
											<input className="form-check-input" type="checkbox" id={`channel-${option}`} checked={selectedChannels.includes(option)} onChange={() => toggleSelection(setSelectedChannels, option)} />
											<label className="form-check-label small" htmlFor={`channel-${option}`}>{option}</label>
										</div>
									))}
								</div>
								<div className="small text-muted fw-semibold mb-1">Recurring</div>
								<div className="mb-3">
									<div className="form-check">
										<input className="form-check-input" type="checkbox" id="recurring-only" checked={selectedRecurringFlags.includes("recurring")} onChange={() => toggleSelection(setSelectedRecurringFlags, "recurring")} />
										<label className="form-check-label small" htmlFor="recurring-only">Recurring</label>
									</div>
									<div className="form-check">
										<input className="form-check-input" type="checkbox" id="one-time-only" checked={selectedRecurringFlags.includes("oneTime")} onChange={() => toggleSelection(setSelectedRecurringFlags, "oneTime")} />
										<label className="form-check-label small" htmlFor="one-time-only">One-time</label>
									</div>
								</div>
								<button className="btn btn-outline-secondary btn-sm" onClick={() => { setSearch(""); setSelectedDonationTypes([]); setSelectedChannels([]); setSelectedRecurringFlags([]); }}>
									Clear All Filters
								</button>
							</div>
						</div>
					</div>
					<div className="col-lg-9">
					<div className="table-responsive">
						<table className="table table-sm table-hover">
							<thead className="table-light">
								<tr>
									<th role="button" onClick={() => toggleSort("donationId")}>ID{sortIndicator("donationId")}</th>
									<th role="button" onClick={() => toggleSort("supporterId")}>Supporter{sortIndicator("supporterId")}</th>
									<th role="button" onClick={() => toggleSort("donationType")}>Type{sortIndicator("donationType")}</th>
									<th role="button" onClick={() => toggleSort("donationDate")}>Date{sortIndicator("donationDate")}</th>
									<th role="button" onClick={() => toggleSort("amount")}>Amount{sortIndicator("amount")}</th>
									<th role="button" onClick={() => toggleSort("currencyCode")}>Currency{sortIndicator("currencyCode")}</th>
									<th role="button" onClick={() => toggleSort("channelSource")}>Channel{sortIndicator("channelSource")}</th>
									<th role="button" onClick={() => toggleSort("campaignName")}>Campaign{sortIndicator("campaignName")}</th>
									<th role="button" onClick={() => toggleSort("isRecurring")}>Recurring{sortIndicator("isRecurring")}</th>
									{isAdmin && <th>Actions</th>}
								</tr>
							</thead>
							<tbody>
								{pagedDonations.map((d) => (
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
					<div className="d-flex justify-content-between align-items-center mt-2 mb-4 gap-2 flex-wrap">
						<small className="text-muted">{sortedDonations.length} donations total</small>
						<div className="d-flex gap-2 align-items-center">
							<label className="small text-muted mb-0">Per page</label>
							<select className="form-select form-select-sm" style={{ width: 90 }} value={String(pageSize)} onChange={(e) => setPageSize(Number(e.target.value))}>
								<option value="5">5</option>
								<option value="10">10</option>
								<option value="20">20</option>
							</select>
							<button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
								Previous
							</button>
							<span className="small text-muted">
								Page {page} of {totalPages}
							</span>
							<button className="btn btn-outline-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
								Next
							</button>
						</div>
					</div>
					</div>
				</div>
			) : (
				<div className="row g-3">
					<div className="col-lg-3">
						<div className="card shadow-sm">
							<div className="card-body">
								<h6 className="mb-3">Filters</h6>
								<label className="form-label small mb-1">Search</label>
								<input
									type="text"
									className="form-control form-control-sm mb-3"
									placeholder="ID, name, email, region..."
									value={supporterSearch}
									onChange={(e) => setSupporterSearch(e.target.value)}
								/>
								<div className="small text-muted fw-semibold mb-1">Type</div>
								<div className="mb-3">
									{supporterTypeOptions.map((option) => (
										<div className="form-check" key={`supporter-type-${option}`}>
											<input className="form-check-input" type="checkbox" id={`supporter-type-${option}`} checked={selectedSupporterTypes.includes(option)} onChange={() => toggleSelection(setSelectedSupporterTypes, option)} />
											<label className="form-check-label small" htmlFor={`supporter-type-${option}`}>{option}</label>
										</div>
									))}
								</div>
								<div className="small text-muted fw-semibold mb-1">Status</div>
								<div className="mb-3">
									{supporterStatusOptions.map((option) => (
										<div className="form-check" key={`supporter-status-${option}`}>
											<input className="form-check-input" type="checkbox" id={`supporter-status-${option}`} checked={selectedSupporterStatuses.includes(option)} onChange={() => toggleSelection(setSelectedSupporterStatuses, option)} />
											<label className="form-check-label small" htmlFor={`supporter-status-${option}`}>{option}</label>
										</div>
									))}
								</div>
								<div className="small text-muted fw-semibold mb-1">Channel</div>
								<div className="mb-3">
									{supporterChannelOptions.map((option) => (
										<div className="form-check" key={`supporter-channel-${option}`}>
											<input className="form-check-input" type="checkbox" id={`supporter-channel-${option}`} checked={selectedSupporterChannels.includes(option)} onChange={() => toggleSelection(setSelectedSupporterChannels, option)} />
											<label className="form-check-label small" htmlFor={`supporter-channel-${option}`}>{option}</label>
										</div>
									))}
								</div>
								<button
									className="btn btn-outline-secondary btn-sm"
									onClick={() => { setSupporterSearch(""); setSelectedSupporterTypes([]); setSelectedSupporterStatuses([]); setSelectedSupporterChannels([]); }}
								>
									Clear All Filters
								</button>
							</div>
						</div>
					</div>
					<div className="col-lg-9">
						<div className="table-responsive">
							<table className="table table-sm table-hover">
								<thead className="table-light">
									<tr>
										<th role="button" onClick={() => toggleSupporterSort("supporterId")}>ID{supporterSortIndicator("supporterId")}</th>
										<th role="button" onClick={() => toggleSupporterSort("displayName")}>Display Name{supporterSortIndicator("displayName")}</th>
										<th role="button" onClick={() => toggleSupporterSort("supporterType")}>Type{supporterSortIndicator("supporterType")}</th>
										<th role="button" onClick={() => toggleSupporterSort("email")}>Email{supporterSortIndicator("email")}</th>
										<th role="button" onClick={() => toggleSupporterSort("region")}>Region{supporterSortIndicator("region")}</th>
										<th role="button" onClick={() => toggleSupporterSort("country")}>Country{supporterSortIndicator("country")}</th>
										<th role="button" onClick={() => toggleSupporterSort("status")}>Status{supporterSortIndicator("status")}</th>
										<th role="button" onClick={() => toggleSupporterSort("acquisitionChannel")}>Channel{supporterSortIndicator("acquisitionChannel")}</th>
										<PropensityHeader onSort={() => toggleSupporterSort("propensityScore")} indicator={supporterSortIndicator("propensityScore")} />
										{isAdmin && <th>Actions</th>}
									</tr>
								</thead>
								<tbody>
									{pagedSupporters.map((s) => (
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
											<td style={{ whiteSpace: "nowrap" }}>
												{s.propensityScore == null ? "—" : `${(s.propensityScore * 100).toFixed(1)}%`}
											</td>
											{isAdmin && (
												<td>
													<button className="btn btn-outline-secondary btn-sm me-1" onClick={() => handleEditSupporter(s)}>
														Edit
													</button>
													<button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteSupporter(s.supporterId)}>
														Delete
													</button>
												</td>
											)}
										</tr>
									))}
								</tbody>
							</table>
						</div>
						<div className="d-flex justify-content-between align-items-center mt-2 mb-4 gap-2 flex-wrap">
							<small className="text-muted">{sortedSupporters.length} supporters total</small>
							<div className="d-flex gap-2 align-items-center">
								<label className="small text-muted mb-0">Per page</label>
								<select className="form-select form-select-sm" style={{ width: 90 }} value={String(supporterPageSize)} onChange={(e) => setSupporterPageSize(Number(e.target.value))}>
									<option value="5">5</option>
									<option value="10">10</option>
									<option value="20">20</option>
								</select>
								<button className="btn btn-outline-secondary btn-sm" disabled={supporterPage <= 1} onClick={() => setSupporterPage((p) => p - 1)}>
									Previous
								</button>
								<span className="small text-muted">
									Page {supporterPage} of {supporterTotalPages}
								</span>
								<button className="btn btn-outline-secondary btn-sm" disabled={supporterPage >= supporterTotalPages} onClick={() => setSupporterPage((p) => p + 1)}>
									Next
								</button>
							</div>
						</div>
					</div>
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
									<div className="col-md-6">
										<label className="form-label small">Impact Unit</label>
										<select
											className="form-select form-select-sm"
											value={String(editingDonation.impactUnit ?? "")}
											onChange={(e) => setEditingDonation((prev) => (prev ? { ...prev, impactUnit: e.target.value || undefined } : prev))}
										>
											<option value="">Select unit...</option>
											{IMPACT_UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
										</select>
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

			{/* Supporter Modal */}
			{showSupporterModal && editingSupporter && (
				<div className="modal d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.4)" }}>
					<div className="modal-dialog modal-lg">
						<div className="modal-content">
							<div className="modal-header">
								<h5 className="modal-title">{editingSupporter.supporterId ? "Edit Supporter" : "Add Supporter"}</h5>
								<button type="button" className="btn-close" onClick={() => setShowSupporterModal(false)} />
							</div>
							<div className="modal-body">
								{saveSupporterError ? <div className="alert alert-danger">{saveSupporterError}</div> : null}
								<div className="row g-3">
									<div className="col-md-6">
										<label className="form-label small mb-1">Display Name</label>
										<input
											type="text"
											className="form-control form-control-sm"
											value={String(editingSupporter.displayName ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, displayName: e.target.value } : prev))}
										/>
									</div>
									<div className="col-md-6">
										<label className="form-label small mb-1">Organization Name</label>
										<input
											type="text"
											className="form-control form-control-sm"
											value={String(editingSupporter.organizationName ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, organizationName: e.target.value } : prev))}
										/>
									</div>
									<div className="col-md-6">
										<label className="form-label small mb-1">First Name</label>
										<input
											type="text"
											className="form-control form-control-sm"
											value={String(editingSupporter.firstName ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, firstName: e.target.value } : prev))}
										/>
									</div>
									<div className="col-md-6">
										<label className="form-label small mb-1">Last Name</label>
										<input
											type="text"
											className="form-control form-control-sm"
											value={String(editingSupporter.lastName ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, lastName: e.target.value } : prev))}
										/>
									</div>
									<div className="col-md-6">
										<label className="form-label small mb-1">Email</label>
										<input
											type="email"
											className="form-control form-control-sm"
											value={String(editingSupporter.email ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
										/>
									</div>
									<div className="col-md-6">
										<label className="form-label small mb-1">Phone</label>
										<input
											type="text"
											className="form-control form-control-sm"
											value={String(editingSupporter.phone ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, phone: e.target.value } : prev))}
										/>
									</div>
									<div className="col-md-4">
										<label className="form-label small mb-1">Supporter Type</label>
										<select
											className="form-select form-select-sm"
											value={String(editingSupporter.supporterType ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, supporterType: e.target.value } : prev))}
										>
											<option value="">Select...</option>
											<option value="Individual">Individual</option>
											<option value="Corporate">Corporate</option>
											<option value="Foundation">Foundation</option>
											<option value="Church">Church</option>
										</select>
									</div>
									<div className="col-md-4">
										<label className="form-label small mb-1">Status</label>
										<select
											className="form-select form-select-sm"
											value={String(editingSupporter.status ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, status: e.target.value } : prev))}
										>
											<option value="">Select...</option>
											<option value="Active">Active</option>
											<option value="Inactive">Inactive</option>
										</select>
									</div>
									<div className="col-md-4">
										<label className="form-label small mb-1">Acquisition Channel</label>
										<input
											type="text"
											className="form-control form-control-sm"
											value={String(editingSupporter.acquisitionChannel ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, acquisitionChannel: e.target.value } : prev))}
										/>
									</div>
									<div className="col-md-6">
										<label className="form-label small mb-1">Country</label>
										<input
											type="text"
											className="form-control form-control-sm"
											value={String(editingSupporter.country ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, country: e.target.value } : prev))}
										/>
									</div>
									<div className="col-md-6">
										<label className="form-label small mb-1">Region</label>
										<input
											type="text"
											className="form-control form-control-sm"
											value={String(editingSupporter.region ?? "")}
											onChange={(e) => setEditingSupporter((prev) => (prev ? { ...prev, region: e.target.value } : prev))}
										/>
									</div>
								</div>
							</div>
							<div className="modal-footer">
								<button type="button" className="btn btn-secondary" onClick={() => setShowSupporterModal(false)}>
									Cancel
								</button>
								<button type="button" className="btn btn-primary" onClick={handleSaveSupporter} disabled={savingSupporter}>
									{savingSupporter ? "Saving..." : "Save"}
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
