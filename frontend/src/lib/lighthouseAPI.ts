const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

// ─── Residents ────────────────────────────────────────────────────────────────
export interface ResidentListResult {
  total: number;
  page: number;
  pageSize: number;
  items: Resident[];
}

export interface Resident {
  residentId: number;
  internalCode?: string;
  caseControlNo?: string;
  safehouseId?: number;
  caseStatus?: string;
  sex?: string;
  dateOfBirth?: string;
  caseCategory?: string;
  assignedSocialWorker?: string;
  initialRiskLevel?: string;
  currentRiskLevel?: string;
  reintegrationStatus?: string;
  dateOfAdmission?: string;
  dateEnrolled?: string;
  dateClosed?: string;
  mlPredictionStatus?: string;
  mlLastCalculated?: string;
  [key: string]: unknown;
}

export function getResidents(params?: Record<string, string | number>) {
  const qs = new URLSearchParams(
    Object.entries(params ?? {}).map(([k, v]) => [k, String(v)])
  ).toString();
  return apiFetch<ResidentListResult>(`/api/residents${qs ? '?' + qs : ''}`);
}

export function getResidentById(id: number) {
  return apiFetch<Resident>(`/api/residents/${id}`);
}

export function createResident(resident: Partial<Resident>) {
  return apiFetch<Resident>('/api/residents', { method: 'POST', body: JSON.stringify(resident) });
}

export function updateResident(id: number, resident: Partial<Resident>) {
  return apiFetch<void>(`/api/residents/${id}`, { method: 'PUT', body: JSON.stringify(resident) });
}

export function deleteResident(id: number) {
  return apiFetch<void>(`/api/residents/${id}`, { method: 'DELETE' });
}

export function getResidentFilterOptions() {
  return apiFetch<{ caseStatuses: string[]; riskLevels: string[] }>('/api/residents/filter-options');
}

// ─── Safehouses ───────────────────────────────────────────────────────────────
export interface Safehouse {
  safehouseId: number;
  safehouseCode?: string;
  name?: string;
  region?: string;
  city?: string;
  province?: string;
  country?: string;
  status?: string;
  capacityGirls?: number;
  capacityStaff?: number;
  currentOccupancy?: number;
  openDate?: string;
  notes?: string;
}

export function getSafehouses() {
  return apiFetch<Safehouse[]>('/api/safehouses');
}

export function getSafehouseById(id: number) {
  return apiFetch<Safehouse>(`/api/safehouses/${id}`);
}

export function createSafehouse(s: Partial<Safehouse>) {
  return apiFetch<Safehouse>('/api/safehouses', { method: 'POST', body: JSON.stringify(s) });
}

export function updateSafehouse(id: number, s: Partial<Safehouse>) {
  return apiFetch<void>(`/api/safehouses/${id}`, { method: 'PUT', body: JSON.stringify(s) });
}

export function deleteSafehouse(id: number) {
  return apiFetch<void>(`/api/safehouses/${id}`, { method: 'DELETE' });
}

// ─── Safehouse Metrics ────────────────────────────────────────────────────────
export interface SafehouseMetric {
  metricId: number;
  safehouseId?: number;
  monthStart?: string;
  monthEnd?: string;
  activeResidents?: number;
  avgEducationProgress?: number;
  avgHealthScore?: number;
  processRecordingCount?: number;
  homeVisitationCount?: number;
  incidentCount?: number;
  notes?: string;
}

export function getSafehouseMetrics(safehouseId?: number) {
  const qs = safehouseId ? `?safehouseId=${safehouseId}` : '';
  return apiFetch<SafehouseMetric[]>(`/api/safehouse-metrics${qs}`);
}

// ─── Donations ────────────────────────────────────────────────────────────────
export interface Donation {
  donationId: number;
  supporterId?: number;
  donationType?: string;
  donationDate?: string;
  isRecurring?: boolean;
  campaignName?: string;
  channelSource?: string;
  currencyCode?: string;
  amount?: number;
  estimatedValue?: number;
  impactUnit?: string;
  notes?: string;
}

export interface DonationListResult {
  total: number;
  page: number;
  pageSize: number;
  items: Donation[];
}

export interface ForexConversionResult {
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  rate: number;
  asOfDate: string;
  provider: string;
}

export interface DonorImpactSummary {
  personalContributionSummary: {
    totalGivingLifetime: number;
    donationMix: Array<{
      donationType: string;
      value: number;
      percent: number;
    }>;
    recurringStatus: {
      recurringDonationCount: number;
      recurringEstimatedValue: number;
    };
  };
  organizationalImpact: {
    activeResidents: number;
    reintegrationSuccessRate: number;
    educationalProgressAveragePercent: number;
    healthWellbeingGoalsMetPercent: number;
    latestPublishedSnapshot?: {
      snapshotDate?: string;
      headline?: string;
      summaryText?: string;
      metricPayloadJson?: string;
    } | null;
  };
  connection: {
    donorContributionThisYear: number;
    counselingMonthsEquivalent: number;
    assumption: string;
    campaignOutcomes: Array<{
      campaignName: string;
      donorValue: number;
      campaignTotal: number;
      donorSharePercent: number;
    }>;
  };
  explanatoryModel: {
    topInsights: string[];
    isPipelineBacked: boolean;
    placeholder: string;
  };
  reportPlaceholders: {
    pipeline455: string;
  };
}

export function getDonations(params?: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(params ?? {}).map(([k, v]) => [k, String(v)])).toString();
  return apiFetch<DonationListResult>(`/api/donations${qs ? '?' + qs : ''}`);
}

export function getMyDonations(params?: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(params ?? {}).map(([k, v]) => [k, String(v)])).toString();
  return apiFetch<DonationListResult>(`/api/donations/mine${qs ? '?' + qs : ''}`);
}

export function createMyDonation(d: Partial<Donation>) {
  return apiFetch<Donation>('/api/donations/mine', { method: 'POST', body: JSON.stringify(d) });
}

export function convertCurrency(from: 'USD' | 'PHP', to: 'USD' | 'PHP', amount: number) {
  const qs = new URLSearchParams({ from, to, amount: String(amount) }).toString();
  return apiFetch<ForexConversionResult>(`/api/forex/convert?${qs}`);
}

export function getDonorImpactSummary() {
  return apiFetch<DonorImpactSummary>('/api/donor-impact/summary');
}

export function createDonation(d: Partial<Donation>) {
  return apiFetch<Donation>('/api/donations', { method: 'POST', body: JSON.stringify(d) });
}

export function updateDonation(id: number, d: Partial<Donation>) {
  return apiFetch<void>(`/api/donations/${id}`, { method: 'PUT', body: JSON.stringify(d) });
}

export function deleteDonation(id: number) {
  return apiFetch<void>(`/api/donations/${id}`, { method: 'DELETE' });
}

// ─── Supporters ───────────────────────────────────────────────────────────────
export interface Supporter {
  supporterId: number;
  supporterType?: string;
  displayName?: string;
  organizationName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  region?: string;
  country?: string;
  status?: string;
  acquisitionChannel?: string;
}

export interface SupporterListResult {
  total: number;
  page: number;
  pageSize: number;
  items: Supporter[];
}

export function getSupporters(params?: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(params ?? {}).map(([k, v]) => [k, String(v)])).toString();
  return apiFetch<SupporterListResult>(`/api/supporters${qs ? '?' + qs : ''}`);
}

// ─── Incidents ────────────────────────────────────────────────────────────────
export interface IncidentReport {
  incidentId: number;
  residentId?: number;
  safehouseId?: number;
  incidentDate?: string;
  incidentType?: string;
  severity?: string;
  description?: string;
  responseTaken?: string;
  resolved?: boolean;
  resolutionDate?: string;
  reportedBy?: string;
  followUpRequired?: boolean;
}

export function getIncidents(params?: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(params ?? {}).map(([k, v]) => [k, String(v)])).toString();
  return apiFetch<IncidentReport[]>(`/api/incident-reports${qs ? '?' + qs : ''}`);
}

export function createIncident(i: Partial<IncidentReport>) {
  return apiFetch<IncidentReport>('/api/incident-reports', { method: 'POST', body: JSON.stringify(i) });
}

export function updateIncident(id: number, i: Partial<IncidentReport>) {
  return apiFetch<void>(`/api/incident-reports/${id}`, { method: 'PUT', body: JSON.stringify(i) });
}

export function deleteIncident(id: number) {
  return apiFetch<void>(`/api/incident-reports/${id}`, { method: 'DELETE' });
}

// ─── Health Records ───────────────────────────────────────────────────────────
export interface HealthRecord {
  healthRecordId: number;
  residentId?: number;
  recordDate?: string;
  generalHealthScore?: number;
  nutritionScore?: number;
  sleepQualityScore?: number;
  energyLevelScore?: number;
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  medicalCheckupDone?: boolean;
  dentalCheckupDone?: boolean;
  psychologicalCheckupDone?: boolean;
  notes?: string;
}

export function getHealthRecords(residentId?: number) {
  const qs = residentId ? `?residentId=${residentId}` : '';
  return apiFetch<HealthRecord[]>(`/api/health-records${qs}`);
}

// ─── Education Records ────────────────────────────────────────────────────────
export interface EducationRecord {
  educationRecordId: number;
  residentId?: number;
  recordDate?: string;
  educationLevel?: string;
  schoolName?: string;
  enrollmentStatus?: string;
  attendanceRate?: number;
  progressPercent?: number;
  completionStatus?: string;
  notes?: string;
}

export function getEducationRecords(residentId?: number) {
  const qs = residentId ? `?residentId=${residentId}` : '';
  return apiFetch<EducationRecord[]>(`/api/education-records${qs}`);
}

// ─── Intervention Plans ───────────────────────────────────────────────────────
export interface InterventionPlan {
  planId: number;
  residentId?: number;
  planCategory?: string;
  planDescription?: string;
  servicesProvided?: string;
  status?: string;
  targetDate?: string;
}

export function getInterventionPlans(residentId?: number) {
  const qs = residentId ? `?residentId=${residentId}` : '';
  return apiFetch<InterventionPlan[]>(`/api/intervention-plans${qs}`);
}

// ─── Partners ─────────────────────────────────────────────────────────────────
export interface Partner {
  partnerId: number;
  partnerName?: string;
  partnerType?: string;
  roleType?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  region?: string;
  status?: string;
}

export function getPartners() {
  return apiFetch<Partner[]>('/api/partners');
}

// ─── Campaigns ────────────────────────────────────────────────────────────────
export interface Campaign {
  campaignId: number;
  campaignName?: string;
  totalValue?: number;
  donorCount?: number;
  meanValue?: number;
  compositeScore?: number;
  rank?: number;
  verdict?: string;
  mlLastCalculated?: string;
}

export interface CampaignChannelBreakdown {
  campaign: string;
  channel: string;
  totalValue?: number;
  donorCount?: number;
}

export function getCampaigns() {
  return apiFetch<Campaign[]>('/api/campaigns');
}

export function getCampaignChannelBreakdown() {
  return apiFetch<CampaignChannelBreakdown[]>('/api/campaigns/channel-breakdown');
}
