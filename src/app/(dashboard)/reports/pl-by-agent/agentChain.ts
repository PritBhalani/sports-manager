import { getUserById } from "@/services/user.service";

export type AgentChainSeg = { id: string; label: string; userType: number };

export function unwrapUserPayload(raw: unknown): Record<string, unknown> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const data = r.data;
  if (data !== null && data !== undefined && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return r;
}

function pickUserLabel(u: Record<string, unknown>): string {
  for (const key of [
    "username",
    "userName",
    "loginName",
    "userCode",
    "code",
    "name",
    "fullName",
  ]) {
    const v = u[key];
    if (typeof v === "string" && v.trim()) {
      const t = v.trim();
      if (t.toLowerCase() === "user") continue;
      return t;
    }
  }
  const id = u.id ?? u._id;
  if (typeof id === "string" && id.trim()) {
    const t = id.trim();
    return t.length > 8 ? `${t.slice(0, 6)}…` : t;
  }
  if (id != null) return String(id);
  return "…";
}

export function pickParentId(u: Record<string, unknown>): string | null {
  const p = u.parentId ?? u.parent_id;
  if (typeof p === "string" && p.trim()) return p.trim();
  const parent = u.parent;
  if (parent && typeof parent === "object" && !Array.isArray(parent)) {
    const pid = (parent as Record<string, unknown>).id;
    if (typeof pid === "string" && pid.trim()) return pid.trim();
  }
  return null;
}

function pickUserType(u: Record<string, unknown>): number {
  const t = u.userType ?? u.user_type;
  if (typeof t === "number" && Number.isFinite(t)) return t;
  if (typeof t === "string") {
    const n = Number.parseInt(t, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** Walk parentId from leaf to root; ordered root → leaf (for breadcrumbs). */
export async function buildAgentAncestorChain(
  leafUserId: string,
  fallbackUserType: number,
): Promise<AgentChainSeg[]> {
  const ordered: AgentChainSeg[] = [];
  const seen = new Set<string>();
  let cur: string | null = leafUserId.trim();
  let depth = 0;
  const maxDepth = 12;

  while (cur && depth < maxDepth && !seen.has(cur)) {
    const nodeId: string = cur;
    seen.add(nodeId);
    try {
      const raw = await getUserById(nodeId);
      const u = unwrapUserPayload(raw);
      if (!u) {
        ordered.unshift({
          id: nodeId,
          label: nodeId.length > 8 ? `${nodeId.slice(0, 6)}…` : nodeId,
          userType: fallbackUserType,
        });
        break;
      }
      ordered.unshift({ id: nodeId, label: pickUserLabel(u), userType: pickUserType(u) });
      const parentId = pickParentId(u);
      if (!parentId || parentId === nodeId) cur = null;
      else cur = parentId;
    } catch {
      ordered.unshift({
        id: nodeId,
        label: nodeId.length > 8 ? `${nodeId.slice(0, 6)}…` : nodeId,
        userType: fallbackUserType,
      });
      break;
    }
    depth++;
  }

  if (ordered.length === 0) {
    return [{ id: leafUserId, label: leafUserId, userType: fallbackUserType }];
  }
  return ordered;
}
