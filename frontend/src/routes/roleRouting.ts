import type { AuthSession } from "../types/AuthSession";

const roleHomeMap: Record<string, string> = {
	admin: "/residents",
	donor: "/donor-portal",
};

const allowedReturnPaths = new Set(["/residents", "/safehouses", "/donations", "/incidents", "/donor-portal", "/donor-impact", "/mfa"]);

export function normalizeRoles(roles: string[]): string[] {
	return roles.map((role) => role.trim().toLowerCase()).filter(Boolean);
}

export function resolveRoleHome(authSession: AuthSession): string | null {
	if (!authSession.isAuthenticated) return null;

	const normalizedRoles = normalizeRoles(authSession.roles);
	for (const role of normalizedRoles) {
		const mappedHome = roleHomeMap[role];
		if (mappedHome) return mappedHome;
	}

	return null;
}

export function hasAnyRole(authSession: AuthSession, allowedRoles: string[]): boolean {
	const assignedRoles = new Set(normalizeRoles(authSession.roles));
	return allowedRoles.some((role) => assignedRoles.has(role.trim().toLowerCase()));
}

export function isAllowedReturnPath(returnTo: string | null): returnTo is string {
	if (!returnTo) return false;
	if (!returnTo.startsWith("/") || returnTo.startsWith("//")) return false;
	return allowedReturnPaths.has(returnTo);
}
