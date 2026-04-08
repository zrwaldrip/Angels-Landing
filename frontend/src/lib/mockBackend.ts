import type { AuthSession } from '../types/AuthSession';
import type { TwoFactorStatus } from '../types/TwoFactorStatus';

const rawMockFlag = String(import.meta.env.VITE_USE_MOCK_DATA ?? '').trim().toLowerCase();
const hasApiBaseUrl = String(import.meta.env.VITE_API_BASE_URL ?? '').trim().length > 0;

export const useMockBackend = rawMockFlag === 'true' || (!hasApiBaseUrl && rawMockFlag !== 'false');

const SESSION_EMAIL_KEY = 'al.mock.session.email';

interface MockUser {
  id: string;
  email: string;
  userName: string;
  password: string;
  roles: string[];
  emailConfirmed: boolean;
  lockoutEnabled: boolean;
  lockoutEndUtc: string | null;
  twoFactorEnabled: boolean;
  recoveryCodes: string[];
}

interface MockResident {
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
}

interface MockSafehouse {
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

interface MockSafehouseMetric {
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

interface MockIncidentReport {
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

interface MockHealthRecord {
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

interface MockEducationRecord {
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

interface MockInterventionPlan {
  planId: number;
  residentId?: number;
  planCategory?: string;
  planDescription?: string;
  servicesProvided?: string;
  status?: string;
  targetDate?: string;
}

interface MockProcessRecording {
  recordingId: number;
  residentId?: number;
  sessionDate?: string;
  socialWorker?: string;
  sessionType?: string;
  sessionDurationMinutes?: number;
  emotionalStateObserved?: string;
  emotionalStateEnd?: string;
  sessionNarrative?: string;
  interventionsApplied?: string;
  followUpActions?: string;
  progressNoted?: boolean;
  concernsFlagged?: boolean;
  referralMade?: boolean;
  notesRestricted?: string;
}

interface MockSupporter {
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

interface MockDonation {
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

interface MockCampaign {
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

interface MockCampaignChannelBreakdown {
  campaign: string;
  channel: string;
  totalValue?: number;
  donorCount?: number;
}

export const mockCredentialHints = [
  { email: 'admin@angelslanding.test', password: 'Admin123!', roles: ['Admin', 'Donor'] },
  { email: 'donor@angelslanding.test', password: 'Donor123!', roles: ['Donor'] },
];

let mockUsers: MockUser[] = [
  {
    id: 'usr-admin-1',
    email: 'admin@angelslanding.test',
    userName: 'admin',
    password: 'Admin123!',
    roles: ['Admin', 'Donor'],
    emailConfirmed: true,
    lockoutEnabled: false,
    lockoutEndUtc: null,
    twoFactorEnabled: false,
    recoveryCodes: ['ALPHA-ADMIN-1001', 'ALPHA-ADMIN-1002', 'ALPHA-ADMIN-1003'],
  },
  {
    id: 'usr-donor-1',
    email: 'donor@angelslanding.test',
    userName: 'donor',
    password: 'Donor123!',
    roles: ['Donor'],
    emailConfirmed: true,
    lockoutEnabled: false,
    lockoutEndUtc: null,
    twoFactorEnabled: false,
    recoveryCodes: ['ALPHA-DONOR-2001', 'ALPHA-DONOR-2002', 'ALPHA-DONOR-2003'],
  },
];

let residents: MockResident[] = [
  {
    residentId: 101,
    internalCode: 'AL-R101',
    caseControlNo: 'CC-2025-001',
    safehouseId: 1,
    caseStatus: 'Active',
    sex: 'F',
    caseCategory: 'Trafficking Survivor',
    assignedSocialWorker: 'Maria Santos',
    initialRiskLevel: 'High',
    currentRiskLevel: 'Medium',
    reintegrationStatus: 'In Program',
    dateOfAdmission: '2025-06-10',
    dateEnrolled: '2025-06-12',
    mlPredictionStatus: 'Improving',
    mlLastCalculated: '2026-04-01',
  },
  {
    residentId: 102,
    internalCode: 'AL-R102',
    caseControlNo: 'CC-2025-014',
    safehouseId: 1,
    caseStatus: 'Active',
    sex: 'F',
    caseCategory: 'Family Violence',
    assignedSocialWorker: 'Elena Cruz',
    initialRiskLevel: 'Critical',
    currentRiskLevel: 'High',
    reintegrationStatus: 'Stabilizing',
    dateOfAdmission: '2025-09-03',
    dateEnrolled: '2025-09-05',
    mlPredictionStatus: 'Stalling',
    mlLastCalculated: '2026-04-01',
  },
  {
    residentId: 103,
    internalCode: 'AL-R103',
    caseControlNo: 'CC-2024-066',
    safehouseId: 2,
    caseStatus: 'Active',
    sex: 'F',
    caseCategory: 'Trauma Recovery',
    assignedSocialWorker: 'Maria Santos',
    initialRiskLevel: 'Medium',
    currentRiskLevel: 'Low',
    reintegrationStatus: 'Preparing Exit',
    dateOfAdmission: '2024-11-20',
    dateEnrolled: '2024-11-22',
    mlPredictionStatus: 'Improving',
    mlLastCalculated: '2026-04-01',
  },
];

let safehouses: MockSafehouse[] = [
  {
    safehouseId: 1,
    safehouseCode: 'SH-NCR-01',
    name: 'Hope Haven Manila',
    region: 'NCR',
    city: 'Quezon City',
    province: 'Metro Manila',
    country: 'Philippines',
    status: 'Active',
    capacityGirls: 32,
    capacityStaff: 18,
    currentOccupancy: 26,
    openDate: '2022-01-10',
  },
  {
    safehouseId: 2,
    safehouseCode: 'SH-CAL-02',
    name: 'Light House Laguna',
    region: 'CALABARZON',
    city: 'Sta. Rosa',
    province: 'Laguna',
    country: 'Philippines',
    status: 'Active',
    capacityGirls: 24,
    capacityStaff: 14,
    currentOccupancy: 17,
    openDate: '2023-05-18',
  },
];

let safehouseMetrics: MockSafehouseMetric[] = [
  { metricId: 1, safehouseId: 1, monthStart: '2026-01-01', monthEnd: '2026-01-31', activeResidents: 25, avgEducationProgress: 69.2, avgHealthScore: 73.4, processRecordingCount: 38, homeVisitationCount: 12, incidentCount: 5 },
  { metricId: 2, safehouseId: 1, monthStart: '2026-02-01', monthEnd: '2026-02-28', activeResidents: 26, avgEducationProgress: 71.8, avgHealthScore: 75.2, processRecordingCount: 42, homeVisitationCount: 15, incidentCount: 4 },
  { metricId: 3, safehouseId: 2, monthStart: '2026-01-01', monthEnd: '2026-01-31', activeResidents: 17, avgEducationProgress: 74.6, avgHealthScore: 77.3, processRecordingCount: 29, homeVisitationCount: 8, incidentCount: 2 },
];

let incidents: MockIncidentReport[] = [
  { incidentId: 2001, residentId: 102, safehouseId: 1, incidentDate: '2026-03-11', incidentType: 'Conflict', severity: 'Medium', description: 'Conflict during group activity', responseTaken: 'Mediation', resolved: true, reportedBy: 'Elena Cruz', followUpRequired: true },
  { incidentId: 2002, residentId: 101, safehouseId: 1, incidentDate: '2026-03-23', incidentType: 'Runaway Risk', severity: 'High', description: 'Resident expressed intent to leave', responseTaken: 'Safety planning', resolved: false, reportedBy: 'Maria Santos', followUpRequired: true },
];

let interventionPlans: MockInterventionPlan[] = [
  { planId: 3001, residentId: 101, planCategory: 'Trauma Counseling', planDescription: 'Weekly trauma-informed sessions', servicesProvided: 'CBT + grounding', status: 'In Progress', targetDate: '2026-05-30' },
  { planId: 3002, residentId: 102, planCategory: 'Stabilization', planDescription: 'Safety and emotional regulation', servicesProvided: 'Safety plan updates', status: 'In Progress', targetDate: '2026-04-25' },
];

let healthRecords: MockHealthRecord[] = [
  { healthRecordId: 4001, residentId: 101, recordDate: '2026-03-01', generalHealthScore: 74, nutritionScore: 70, sleepQualityScore: 72, energyLevelScore: 75, bmi: 20.6, medicalCheckupDone: true, dentalCheckupDone: true, psychologicalCheckupDone: true },
  { healthRecordId: 4002, residentId: 102, recordDate: '2026-03-01', generalHealthScore: 68, nutritionScore: 65, sleepQualityScore: 60, energyLevelScore: 62, bmi: 19.9, medicalCheckupDone: true, dentalCheckupDone: false, psychologicalCheckupDone: true },
];

let educationRecords: MockEducationRecord[] = [
  { educationRecordId: 5001, residentId: 101, recordDate: '2026-03-01', educationLevel: 'Secondary', schoolName: 'Hope Learning Center', enrollmentStatus: 'Enrolled', attendanceRate: 93.1, progressPercent: 71.2, completionStatus: 'Ongoing' },
  { educationRecordId: 5002, residentId: 103, recordDate: '2026-03-01', educationLevel: 'Vocational', schoolName: 'Skills Institute', enrollmentStatus: 'Enrolled', attendanceRate: 95.5, progressPercent: 82.4, completionStatus: 'Ongoing' },
];

let processRecordings: MockProcessRecording[] = [
  {
    recordingId: 6001,
    residentId: 101,
    sessionDate: '2026-02-14',
    socialWorker: 'Maria Santos',
    sessionType: 'Individual',
    sessionDurationMinutes: 60,
    emotionalStateObserved: 'Anxious but engaged',
    emotionalStateEnd: 'Calmer and hopeful',
    sessionNarrative: 'Resident discussed recurring nightmares and identified triggers connected to loud noises.',
    interventionsApplied: 'Grounding exercise, breathing sequence, trauma psychoeducation',
    followUpActions: 'Practice grounding twice daily; review sleep routine next session',
    progressNoted: true,
    concernsFlagged: false,
    referralMade: false,
  },
  {
    recordingId: 6002,
    residentId: 101,
    sessionDate: '2026-03-12',
    socialWorker: 'Maria Santos',
    sessionType: 'Group',
    sessionDurationMinutes: 90,
    emotionalStateObserved: 'Reserved at start',
    emotionalStateEnd: 'Participative and connected',
    sessionNarrative: 'Participated in peer sharing circle and verbalized personal safety boundaries.',
    interventionsApplied: 'Narrative sharing, strengths reflection',
    followUpActions: 'Assign journaling prompt and check-ins after evening reflection',
    progressNoted: true,
    concernsFlagged: false,
    referralMade: false,
  },
  {
    recordingId: 6003,
    residentId: 102,
    sessionDate: '2026-03-20',
    socialWorker: 'Elena Cruz',
    sessionType: 'Individual',
    sessionDurationMinutes: 50,
    emotionalStateObserved: 'Hypervigilant and tearful',
    emotionalStateEnd: 'Less distressed but still guarded',
    sessionNarrative: 'Session focused on recent conflict and trust ruptures in shared spaces.',
    interventionsApplied: 'Emotion labeling and body scan',
    followUpActions: 'Coordinate with case team for additional evening support',
    progressNoted: false,
    concernsFlagged: true,
    referralMade: true,
  },
];

let supporters: MockSupporter[] = [
  { supporterId: 1, supporterType: 'Individual', displayName: 'Admin Account', firstName: 'Admin', lastName: 'User', email: 'admin@angelslanding.test', region: 'NCR', country: 'Philippines', status: 'Active', acquisitionChannel: 'Direct' },
  { supporterId: 2, supporterType: 'Individual', displayName: 'Donor Account', firstName: 'Donor', lastName: 'User', email: 'donor@angelslanding.test', region: 'NCR', country: 'Philippines', status: 'Active', acquisitionChannel: 'Campaign' },
  { supporterId: 3, supporterType: 'Organization', displayName: 'Harbor Foundation', organizationName: 'Harbor Foundation', email: 'partnerships@harbor.foundation', region: 'Central Luzon', country: 'Philippines', status: 'Active', acquisitionChannel: 'PartnerReferral' },
];

let donations: MockDonation[] = [
  { donationId: 7001, supporterId: 1, donationType: 'Monetary', donationDate: '2026-01-05', isRecurring: true, campaignName: 'Year-End Hope', channelSource: 'Campaign', currencyCode: 'PHP', amount: 5000, estimatedValue: 5000 },
  { donationId: 7002, supporterId: 2, donationType: 'Monetary', donationDate: '2026-02-21', isRecurring: false, campaignName: 'GivingTuesday', channelSource: 'Campaign', currencyCode: 'PHP', amount: 2500, estimatedValue: 2500 },
  { donationId: 7003, supporterId: 3, donationType: 'InKind', donationDate: '2026-03-10', isRecurring: false, campaignName: 'Back to School', channelSource: 'PartnerReferral', currencyCode: 'PHP', estimatedValue: 18000, impactUnit: 'School kits' },
];

const campaigns: MockCampaign[] = [
  { campaignId: 1, campaignName: 'Year-End Hope', totalValue: 280000, donorCount: 210, meanValue: 1333.33, compositeScore: 0.89, rank: 1, verdict: 'Moving the needle', mlLastCalculated: '2026-04-01' },
  { campaignId: 2, campaignName: 'GivingTuesday', totalValue: 195000, donorCount: 166, meanValue: 1174.69, compositeScore: 0.74, rank: 2, verdict: 'Mixed results', mlLastCalculated: '2026-04-01' },
  { campaignId: 3, campaignName: 'Back to School', totalValue: 92000, donorCount: 59, meanValue: 1559.32, compositeScore: 0.41, rank: 3, verdict: 'Noise / baseline', mlLastCalculated: '2026-04-01' },
];

const campaignBreakdown: MockCampaignChannelBreakdown[] = [
  { campaign: 'Year-End Hope', channel: 'Campaign', totalValue: 190000, donorCount: 130 },
  { campaign: 'Year-End Hope', channel: 'Direct', totalValue: 60000, donorCount: 60 },
  { campaign: 'Year-End Hope', channel: 'Event', totalValue: 30000, donorCount: 20 },
  { campaign: 'GivingTuesday', channel: 'Campaign', totalValue: 140000, donorCount: 120 },
  { campaign: 'GivingTuesday', channel: 'SocialMedia', totalValue: 35000, donorCount: 30 },
  { campaign: 'GivingTuesday', channel: 'Direct', totalValue: 20000, donorCount: 16 },
  { campaign: 'Back to School', channel: 'PartnerReferral', totalValue: 58000, donorCount: 24 },
  { campaign: 'Back to School', channel: 'Campaign', totalValue: 34000, donorCount: 35 },
];

function getStoredSessionEmail() {
  try {
    return localStorage.getItem(SESSION_EMAIL_KEY);
  } catch {
    return null;
  }
}

function setStoredSessionEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(SESSION_EMAIL_KEY, email);
    else localStorage.removeItem(SESSION_EMAIL_KEY);
  } catch {
    // Ignore localStorage failures in private browsing environments.
  }
}

function currentUser(): MockUser | null {
  const email = getStoredSessionEmail();
  if (!email) return null;
  return mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null;
}

function requireCurrentUser(): MockUser {
  const user = currentUser();
  if (!user) throw new Error('Not authenticated. Please sign in.');
  return user;
}

function requireAdminUser(): MockUser {
  const user = requireCurrentUser();
  if (!user.roles.includes('Admin')) throw new Error('Admin role required for this action.');
  return user;
}

function asSession(user: MockUser | null): AuthSession {
  if (!user) {
    return {
      isAuthenticated: false,
      userName: null,
      email: null,
      roles: [],
    };
  }
  return {
    isAuthenticated: true,
    userName: user.userName,
    email: user.email,
    roles: [...user.roles],
  };
}

function toPaged<T>(items: T[], page: number, pageSize: number) {
  const start = Math.max(0, (page - 1) * pageSize);
  const pagedItems = items.slice(start, start + pageSize);
  return {
    total: items.length,
    page,
    pageSize,
    items: pagedItems,
  };
}

function nextId(items: Array<{ [key: string]: unknown }>, idKey: string) {
  const max = items.reduce((acc, item) => {
    const raw = item[idKey];
    const n = typeof raw === 'number' ? raw : 0;
    return Math.max(acc, n);
  }, 0);
  return max + 1;
}

function queryValue(url: URL, key: string): string | undefined {
  const value = url.searchParams.get(key);
  return value == null || value.trim() === '' ? undefined : value;
}

function readBody<T>(options?: RequestInit): T {
  const raw = options?.body;
  if (typeof raw !== 'string' || raw.trim().length === 0) return {} as T;
  return JSON.parse(raw) as T;
}

export async function mockGetAuthSession(): Promise<AuthSession> {
  return asSession(currentUser());
}

export async function mockRegisterUser(email: string, password: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Email is required.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');
  if (mockUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    throw new Error('An account with this email already exists in mock mode.');
  }

  const local = normalizedEmail.split('@')[0] || 'user';
  mockUsers = [
    ...mockUsers,
    {
      id: `usr-${Date.now()}`,
      email: normalizedEmail,
      userName: local,
      password,
      roles: ['Donor'],
      emailConfirmed: true,
      lockoutEnabled: false,
      lockoutEndUtc: null,
      twoFactorEnabled: false,
      recoveryCodes: ['NEW-RECOVERY-1001', 'NEW-RECOVERY-1002'],
    },
  ];

  if (!supporters.some((s) => (s.email ?? '').toLowerCase() === normalizedEmail)) {
    supporters = [
      ...supporters,
      {
        supporterId: nextId(supporters as unknown as Array<{ [key: string]: unknown }>, 'supporterId'),
        supporterType: 'Individual',
        displayName: local,
        email: normalizedEmail,
        status: 'Active',
        acquisitionChannel: 'Direct',
      },
    ];
  }
}

export async function mockLoginUser(email: string, password: string): Promise<void> {
  const user = mockUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) {
    throw new Error('Invalid credentials for mock mode. Use one of the sample accounts.');
  }
  setStoredSessionEmail(user.email);
}

export async function mockLogoutUser(): Promise<void> {
  setStoredSessionEmail(null);
}

export async function mockGetTwoFactorStatus(): Promise<TwoFactorStatus> {
  const user = requireCurrentUser();
  return {
    sharedKey: 'JBSWY3DPEHPK3PXP',
    recoveryCodesLeft: user.recoveryCodes.length,
    recoveryCodes: user.recoveryCodes.slice(0, 2),
    isTwoFactorEnabled: user.twoFactorEnabled,
    isMachineRemembered: false,
  };
}

export async function mockEnableTwoFactor(twoFactorCode: string): Promise<TwoFactorStatus> {
  if (twoFactorCode.trim().length < 6) throw new Error('Provide a valid authenticator code.');
  const user = requireCurrentUser();
  user.twoFactorEnabled = true;
  user.recoveryCodes = ['MFA-NEW-9001', 'MFA-NEW-9002', 'MFA-NEW-9003'];
  return mockGetTwoFactorStatus();
}

export async function mockDisableTwoFactor(): Promise<TwoFactorStatus> {
  const user = requireCurrentUser();
  user.twoFactorEnabled = false;
  return mockGetTwoFactorStatus();
}

export async function mockResetRecoveryCodes(): Promise<TwoFactorStatus> {
  const user = requireCurrentUser();
  user.recoveryCodes = [`RESET-${Date.now()}-01`, `RESET-${Date.now()}-02`, `RESET-${Date.now()}-03`];
  return mockGetTwoFactorStatus();
}

export async function mockGetAdminUsers() {
  requireAdminUser();
  return mockUsers.map((u) => ({
    id: u.id,
    email: u.email,
    userName: u.userName,
    emailConfirmed: u.emailConfirmed,
    lockoutEnabled: u.lockoutEnabled,
    lockoutEndUtc: u.lockoutEndUtc,
    twoFactorEnabled: u.twoFactorEnabled,
    roles: [...u.roles],
  }));
}

export async function mockUpdateAdminUser(
  userId: string,
  payload: { roles?: string[]; emailConfirmed?: boolean; lockoutEnabled?: boolean }
) {
  requireAdminUser();
  const target = mockUsers.find((u) => u.id === userId);
  if (!target) throw new Error('User not found.');

  if (payload.roles) target.roles = [...payload.roles];
  if (typeof payload.emailConfirmed === 'boolean') target.emailConfirmed = payload.emailConfirmed;
  if (typeof payload.lockoutEnabled === 'boolean') target.lockoutEnabled = payload.lockoutEnabled;

  return {
    id: target.id,
    email: target.email,
    userName: target.userName,
    emailConfirmed: target.emailConfirmed,
    lockoutEnabled: target.lockoutEnabled,
    lockoutEndUtc: target.lockoutEndUtc,
    twoFactorEnabled: target.twoFactorEnabled,
    roles: [...target.roles],
  };
}

export async function mockDeleteAdminUser(userId: string): Promise<void> {
  const admin = requireAdminUser();
  if (admin.id === userId) throw new Error('You cannot delete your own account in mock mode.');
  mockUsers = mockUsers.filter((u) => u.id !== userId);
}

export async function mockApiFetch(path: string, options?: RequestInit): Promise<unknown> {
  requireCurrentUser();

  const url = new URL(path, 'https://mock.local');
  const pathname = url.pathname;
  const method = (options?.method ?? 'GET').toUpperCase();

  if (pathname === '/api/residents/filter-options' && method === 'GET') {
    const caseStatuses = [...new Set(residents.map((r) => r.caseStatus).filter(Boolean))] as string[];
    const riskLevels = [...new Set(residents.map((r) => r.currentRiskLevel).filter(Boolean))] as string[];
    return { caseStatuses, riskLevels };
  }

  if (pathname === '/api/residents' && method === 'GET') {
    const page = Number(queryValue(url, 'page') ?? '1');
    const pageSize = Number(queryValue(url, 'pageSize') ?? '20');
    const search = (queryValue(url, 'search') ?? '').toLowerCase();
    const caseStatus = queryValue(url, 'caseStatus');
    const riskLevel = queryValue(url, 'riskLevel');

    let filtered = [...residents];
    if (search) {
      filtered = filtered.filter((r) =>
        (r.internalCode ?? '').toLowerCase().includes(search) ||
        (r.caseControlNo ?? '').toLowerCase().includes(search) ||
        (r.assignedSocialWorker ?? '').toLowerCase().includes(search)
      );
    }
    if (caseStatus) filtered = filtered.filter((r) => r.caseStatus === caseStatus);
    if (riskLevel) filtered = filtered.filter((r) => r.currentRiskLevel === riskLevel);

    return toPaged(filtered, page, pageSize);
  }

  if (pathname === '/api/residents' && method === 'POST') {
    const body = readBody<Partial<MockResident>>(options);
    const created: MockResident = { ...body, residentId: nextId(residents as unknown as Array<{ [key: string]: unknown }>, 'residentId') };
    residents = [created, ...residents];
    return created;
  }

  if (pathname.startsWith('/api/residents/') && method === 'PUT') {
    const parts = pathname.split('/');
    const id = Number(parts[parts.length - 1]);
    const body = readBody<Partial<MockResident>>(options);
    residents = residents.map((r) => (r.residentId === id ? { ...r, ...body, residentId: id } : r));
    return undefined;
  }

  if (pathname.startsWith('/api/residents/') && method === 'DELETE') {
    const parts = pathname.split('/');
    const id = Number(parts[parts.length - 1]);
    residents = residents.filter((r) => r.residentId !== id);
    return undefined;
  }

  if (pathname === '/api/safehouses' && method === 'GET') return [...safehouses];

  if (pathname === '/api/safehouse-metrics' && method === 'GET') {
    const safehouseId = Number(queryValue(url, 'safehouseId') ?? '0');
    return safehouseId ? safehouseMetrics.filter((m) => m.safehouseId === safehouseId) : [...safehouseMetrics];
  }

  if (pathname === '/api/incident-reports' && method === 'GET') {
    const residentId = Number(queryValue(url, 'residentId') ?? '0');
    return residentId ? incidents.filter((i) => i.residentId === residentId) : [...incidents];
  }

  if (pathname === '/api/incident-reports' && method === 'POST') {
    const body = readBody<Partial<MockIncidentReport>>(options);
    const created: MockIncidentReport = { ...body, incidentId: nextId(incidents as unknown as Array<{ [key: string]: unknown }>, 'incidentId') };
    incidents = [created, ...incidents];
    return created;
  }

  if (pathname.startsWith('/api/incident-reports/') && method === 'PUT') {
    const parts = pathname.split('/');
    const id = Number(parts[parts.length - 1]);
    const body = readBody<Partial<MockIncidentReport>>(options);
    incidents = incidents.map((i) => (i.incidentId === id ? { ...i, ...body, incidentId: id } : i));
    return undefined;
  }

  if (pathname.startsWith('/api/incident-reports/') && method === 'DELETE') {
    const parts = pathname.split('/');
    const id = Number(parts[parts.length - 1]);
    incidents = incidents.filter((i) => i.incidentId !== id);
    return undefined;
  }

  if (pathname === '/api/intervention-plans' && method === 'GET') {
    const residentId = Number(queryValue(url, 'residentId') ?? '0');
    return residentId ? interventionPlans.filter((i) => i.residentId === residentId) : [...interventionPlans];
  }

  if (pathname === '/api/health-records' && method === 'GET') {
    const residentId = Number(queryValue(url, 'residentId') ?? '0');
    return residentId ? healthRecords.filter((i) => i.residentId === residentId) : [...healthRecords];
  }

  if (pathname === '/api/education-records' && method === 'GET') {
    const residentId = Number(queryValue(url, 'residentId') ?? '0');
    return residentId ? educationRecords.filter((i) => i.residentId === residentId) : [...educationRecords];
  }

  if (pathname === '/api/process-recordings' && method === 'GET') {
    const residentId = Number(queryValue(url, 'residentId') ?? '0');
    const result = residentId ? processRecordings.filter((p) => p.residentId === residentId) : [...processRecordings];
    return result.sort((a, b) => (b.sessionDate ?? '').localeCompare(a.sessionDate ?? ''));
  }

  if (pathname === '/api/process-recordings' && method === 'POST') {
    const body = readBody<Partial<MockProcessRecording>>(options);
    const created: MockProcessRecording = {
      ...body,
      recordingId: nextId(processRecordings as unknown as Array<{ [key: string]: unknown }>, 'recordingId'),
    };
    processRecordings = [created, ...processRecordings];
    return created;
  }

  if (pathname.startsWith('/api/process-recordings/') && method === 'PUT') {
    const parts = pathname.split('/');
    const id = Number(parts[parts.length - 1]);
    const body = readBody<Partial<MockProcessRecording>>(options);
    processRecordings = processRecordings.map((p) => (p.recordingId === id ? { ...p, ...body, recordingId: id } : p));
    return undefined;
  }

  if (pathname.startsWith('/api/process-recordings/') && method === 'DELETE') {
    const parts = pathname.split('/');
    const id = Number(parts[parts.length - 1]);
    processRecordings = processRecordings.filter((p) => p.recordingId !== id);
    return undefined;
  }

  if (pathname === '/api/supporters' && method === 'GET') {
    const page = Number(queryValue(url, 'page') ?? '1');
    const pageSize = Number(queryValue(url, 'pageSize') ?? '20');
    return toPaged([...supporters], page, pageSize);
  }

  if (pathname === '/api/donations' && method === 'GET') {
    const page = Number(queryValue(url, 'page') ?? '1');
    const pageSize = Number(queryValue(url, 'pageSize') ?? '20');
    return toPaged([...donations], page, pageSize);
  }

  if (pathname === '/api/donations' && method === 'POST') {
    requireAdminUser();
    const body = readBody<Partial<MockDonation>>(options);
    const created: MockDonation = { ...body, donationId: nextId(donations as unknown as Array<{ [key: string]: unknown }>, 'donationId') };
    donations = [created, ...donations];
    return created;
  }

  if (pathname.startsWith('/api/donations/') && method === 'PUT') {
    requireAdminUser();
    const parts = pathname.split('/');
    const id = Number(parts[parts.length - 1]);
    const body = readBody<Partial<MockDonation>>(options);
    donations = donations.map((d) => (d.donationId === id ? { ...d, ...body, donationId: id } : d));
    return undefined;
  }

  if (pathname.startsWith('/api/donations/') && method === 'DELETE') {
    requireAdminUser();
    const parts = pathname.split('/');
    const id = Number(parts[parts.length - 1]);
    donations = donations.filter((d) => d.donationId !== id);
    return undefined;
  }

  if (pathname === '/api/donations/mine' && method === 'GET') {
    const user = requireCurrentUser();
    const page = Number(queryValue(url, 'page') ?? '1');
    const pageSize = Number(queryValue(url, 'pageSize') ?? '20');
    const mySupporter = supporters.find((s) => (s.email ?? '').toLowerCase() === user.email.toLowerCase());
    const mine = mySupporter ? donations.filter((d) => d.supporterId === mySupporter.supporterId) : [];
    return toPaged(mine, page, pageSize);
  }

  if (pathname === '/api/donations/mine' && method === 'POST') {
    const user = requireCurrentUser();
    const body = readBody<Partial<MockDonation>>(options);
    const mySupporter = supporters.find((s) => (s.email ?? '').toLowerCase() === user.email.toLowerCase());
    if (!mySupporter) throw new Error('No supporter profile exists for this user.');
    const created: MockDonation = {
      ...body,
      donationId: nextId(donations as unknown as Array<{ [key: string]: unknown }>, 'donationId'),
      supporterId: mySupporter.supporterId,
      donationType: 'Monetary',
      donationDate: body.donationDate ?? new Date().toISOString().slice(0, 10),
    };
    donations = [created, ...donations];
    return created;
  }

  if (pathname === '/api/forex/convert' && method === 'GET') {
    const from = queryValue(url, 'from') ?? 'PHP';
    const to = queryValue(url, 'to') ?? 'USD';
    const amount = Number(queryValue(url, 'amount') ?? '0');
    const rate = from === to ? 1 : from === 'USD' ? 56.12 : 1 / 56.12;
    return {
      fromCurrency: from,
      toCurrency: to,
      amount,
      convertedAmount: amount * rate,
      rate,
      asOfDate: new Date().toISOString().slice(0, 10),
      provider: 'Mock FX Feed',
    };
  }

  if (pathname === '/api/donor-impact/summary' && method === 'GET') {
    return {
      personalContributionSummary: {
        totalGivingLifetime: 75400,
        donationMix: [
          { donationType: 'Monetary', value: 73000, percent: 96.8 },
          { donationType: 'InKind', value: 2400, percent: 3.2 },
        ],
        recurringStatus: {
          recurringDonationCount: 5,
          recurringEstimatedValue: 25000,
        },
      },
      organizationalImpact: {
        activeResidents: 43,
        reintegrationSuccessRate: 67.4,
        educationalProgressAveragePercent: 72.5,
        healthWellbeingGoalsMetPercent: 69.1,
        latestPublishedSnapshot: {
          snapshotDate: '2026-03-31',
          headline: 'Steady gains in recovery consistency',
          summaryText: 'Residents in structured counseling showed stronger emotional regulation benchmarks this month.',
          metricPayloadJson: '{"sample":true}',
        },
      },
      connection: {
        donorContributionThisYear: 22000,
        counselingMonthsEquivalent: 11.2,
        assumption: 'Equivalent based on blended counseling and support service cost model.',
        campaignOutcomes: [
          { campaignName: 'Year-End Hope', donorValue: 12000, campaignTotal: 280000, donorSharePercent: 4.3 },
          { campaignName: 'GivingTuesday', donorValue: 10000, campaignTotal: 195000, donorSharePercent: 5.1 },
        ],
      },
      explanatoryModel: {
        topInsights: [
          'Higher counseling frequency correlates with improved short-term emotional stabilization.',
          'Group sessions improve engagement for residents with lower initial trust scores.',
          'Progress slows when follow-up actions are delayed more than one week.',
        ],
        isPipelineBacked: false,
        placeholder: 'Mock explanatory output',
      },
      reportPlaceholders: {
        pipeline455: 'Pipeline placeholder active in mock mode.',
      },
    };
  }

  if (pathname === '/api/campaigns' && method === 'GET') return [...campaigns];
  if (pathname === '/api/campaigns/channel-breakdown' && method === 'GET') return [...campaignBreakdown];

  throw new Error(`Mock endpoint not implemented: ${method} ${pathname}`);
}
