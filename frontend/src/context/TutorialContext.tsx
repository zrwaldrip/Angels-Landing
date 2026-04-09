import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export interface TutorialStep {
	path?: string;
	highlightKey: string;
	title: string;
	description: string;
}

export const adminTutorialSteps: TutorialStep[] = [
	{
		highlightKey: "home",
		title: "Home",
		description: "Use Home to return to the landing page and organization overview at any time."
	},
	{
		highlightKey: "impact",
		title: "Impact",
		description: "Impact shows donor-facing outcomes and high-level progress snapshots."
	},
	{
		highlightKey: "donor-portal",
		title: "Donor Portal",
		description: "Donor Portal is where donor users can submit and review contributions."
	},
	{
		highlightKey: "operations",
		title: "Operations Menu",
		description: "Operations contains staff tools for case records, residents, partners, and process tracking."
	},
	{
		highlightKey: "operations-incidents",
		title: "Operations: Case Records",
		description: "Case Records helps you log, review, and resolve incident reports."
	},
	{
		highlightKey: "operations-home-visitation",
		title: "Operations: Home Visitation & Conferences",
		description: "Track home visits and case conference follow-ups for each resident."
	},
	{
		highlightKey: "operations-partners",
		title: "Operations: Partners",
		description: "Manage organizations and collaborators supporting survivor services."
	},
	{
		highlightKey: "operations-process-recordings",
		title: "Operations: Process Recordings",
		description: "Under Operations, use Process Recordings to capture process narratives and internal progress documentation."
	},
	{
		highlightKey: "operations-residents",
		title: "Operations: Residents",
		description: "View and manage resident profiles, status, and case details."
	},
	{
		highlightKey: "operations-safehouses",
		title: "Operations: Safehouses",
		description: "Monitor safehouse capacity, occupancy, and location-level data."
	},
	{
		highlightKey: "admin",
		title: "Admin Menu",
		description: "Admin contains dashboard, donations, reports, campaign analysis, and user management."
	},
	{
		highlightKey: "admin-dashboard",
		title: "Admin: Dashboard",
		description: "The dashboard provides an executive overview of key system metrics."
	},
	{
		highlightKey: "admin-campaign-analysis",
		title: "Admin: Campaign Analysis",
		description: "Analyze campaign performance and compare fundraising effectiveness."
	},
	{
		highlightKey: "admin-donations",
		title: "Admin: Donations",
		description: "Review and manage all donation records in one place."
	},
	{
		highlightKey: "admin-reports",
		title: "Admin: Reports & Analytics",
		description: "Generate operational and executive reports for stakeholders."
	},
	{
		highlightKey: "admin-users",
		title: "Admin: Users",
		description: "Manage users, roles, and access controls."
	},
	{
		highlightKey: "donate",
		title: "Donate Button",
		description: "Donate opens the quick donation workflow for adding contributions."
	},
	{
		highlightKey: "profile",
		title: "Profile Menu",
		description: "Profile gives access to account actions like MFA settings, tutorial, and logout."
	}
];

interface TutorialContextValue {
	isOpen: boolean;
	steps: TutorialStep[];
	currentStepIndex: number;
	currentStep: TutorialStep | null;
	startTutorial: () => void;
	closeTutorial: () => void;
	nextStep: () => void;
	prevStep: () => void;
	setStepIndex: (index: number) => void;
}

const TutorialContext = createContext<TutorialContextValue | undefined>(undefined);

export function TutorialProvider({ children }: { children: ReactNode }) {
	const [isOpen, setIsOpen] = useState(false);
	const [currentStepIndex, setCurrentStepIndex] = useState(0);

	function startTutorial() {
		setCurrentStepIndex(0);
		setIsOpen(true);
	}

	function closeTutorial() {
		setIsOpen(false);
		localStorage.setItem("adminTutorialSeen", "true");
	}

	function nextStep() {
		setCurrentStepIndex((prev) => Math.min(prev + 1, adminTutorialSteps.length - 1));
	}

	function prevStep() {
		setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
	}

	function setStepIndex(index: number) {
		const bounded = Math.max(0, Math.min(index, adminTutorialSteps.length - 1));
		setCurrentStepIndex(bounded);
	}

	const value = useMemo<TutorialContextValue>(
		() => ({
			isOpen,
			steps: adminTutorialSteps,
			currentStepIndex,
			currentStep: adminTutorialSteps[currentStepIndex] ?? null,
			startTutorial,
			closeTutorial,
			nextStep,
			prevStep,
			setStepIndex
		}),
		[isOpen, currentStepIndex]
	);

	return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
}

export function useTutorial() {
	const context = useContext(TutorialContext);
	if (!context) throw new Error("useTutorial must be used within TutorialProvider");
	return context;
}

