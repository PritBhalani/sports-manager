/** Mirrors backend `UserType` enum — labels for UI (navbar, profile, etc.). */
const USER_TYPE_LABELS: Record<number, string> = {
  0: "Super Admin",
  1: "Admin",
  2: "Super Master",
  3: "Master",
  4: "Agent",
  5: "Player",
  7: "BM",
  8: "SBM",
  9: "Manager",
  10: "CP",
  11: "Radar",
};

export function formatUserTypeLabel(userType: unknown): string {
  let n: number | null = null;
  if (typeof userType === "number" && Number.isFinite(userType)) n = userType;
  else if (typeof userType === "string") {
    const parsed = Number.parseInt(userType, 10);
    if (Number.isFinite(parsed)) n = parsed;
  }
  if (n === null) return "User";
  return USER_TYPE_LABELS[n] ?? `User type ${n}`;
}
