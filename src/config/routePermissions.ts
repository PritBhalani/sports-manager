/**
 * Map of route path prefixes to the user types allowed to access them.
 * If a route prefix is not listed, it is accessible to all user types.
 *
 * UserType enum/labels reference (from src/utils/userTypeLabel.ts):
 * 0: Super Admin
 * 1: Admin
 * 2: Super Master
 * 3: Master
 * 4: Agent
 * 5: Player
 * 7: BM
 * 8: SBM
 * 9: Manager
 * 10: CP
 * 11: Radar
 */
export const ROUTE_PERMISSIONS: Record<string, number[]> = {
  "/sports-manager": [1, 2, 3], // Only Admin, Super Master, Master can access
};

// Map of route path prefixes to the user types blocked from accessing them (denylist).
// If a route prefix is matched and the userType is in the list, access is blocked.
export const BLOCKED_ROUTE_PERMISSIONS: Record<string, number[]> = {
  "/website/banners": [1, 2, 3], // Admin (1) blocked
  "/website/banking": [1, 2, 3], // Admin (1) blocked
  "/bonus/bonus": [1, 2, 3], // Admin (1) blocked
  "/user-groups": [1, 2, 3], // Admin (1) blocked
  "/flags": [1, 2, 3], // Admin (1) blocked
  "/referrals": [1, 2, 3], // Admin (1) blocked
  "/reports/b2c-summary": [1, 2, 3], // Admin (1) blocked
  "/reports/b2c-activity": [1, 2, 3], // Admin (1) blocked
};

/**
 * Checks if a user is allowed to access a given route based on their userType.
 *
 * @param pathname The path to verify (e.g. /sports-manager, /dashboard)
 * @param userType The user's userType (can be number or numeric string)
 * @returns true if allowed, false if restricted
 */
export function isRouteAllowed(pathname: string, userType: unknown): boolean {
  let n: number | null = null;
  if (typeof userType === "number" && Number.isFinite(userType)) {
    n = userType;
  } else if (typeof userType === "string") {
    const parsed = Number.parseInt(userType, 10);
    if (Number.isFinite(parsed)) n = parsed;
  }

  // Check blocked permissions first (denylist)
  const blockedPrefixes = Object.keys(BLOCKED_ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);
  for (const prefix of blockedPrefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const blockedTypes = BLOCKED_ROUTE_PERMISSIONS[prefix];
      if (n !== null && blockedTypes.includes(n)) {
        return false;
      }
      break;
    }
  }

  // Sort prefixes by length descending to match most specific route first (e.g. /sports-manager/settings before /sports-manager)
  const prefixes = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length);

  for (const prefix of prefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      const allowedTypes = ROUTE_PERMISSIONS[prefix];
      if (n === null || !allowedTypes.includes(n)) {
        return false;
      }
      break;
    }
  }

  return true;
}
