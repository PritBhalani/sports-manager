/**
 * API binding framework – all backend endpoints in one place.
 * Use this when NEXT_PUBLIC_API_BASE is set; mocks are used when base URL is not set (UI-only mode).
 *
 * Structure: path pattern → { method, mock } for safe fallbacks.
 * Do not call these directly from pages; keep using services (account.service, etc.).
 */

export type HttpMethod = "GET" | "POST";

export type Binding = {
  method: HttpMethod;
  /** Default response when no base URL (UI-only mode). */
  mock: unknown;
};

/**
 * Path pattern: use exact path for GET; for POST list endpoints the path is the key.
 * Mock shapes match ApiListResponse or domain types so UI does not break.
 */
export const API_BINDINGS: Record<string, Binding> = {
  // --- Account (README §2) ---
  "/account/getbalance": {
    method: "GET",
    mock: { balance: 0, chips: 0, cash: 0 },
  },
  "/account/transfer": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },
  "/account/transferin": { method: "POST", mock: {} },
  "/account/transferout": { method: "POST", mock: {} },
  "/account/in": { method: "POST", mock: {} },
  "/account/out": { method: "POST", mock: {} },
  "/account/getaccountstatement": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },
  "/account/getplstatement": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },
  "/account/downline": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },
  "/account/getCreditstatement": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },

  // --- Dashboard (README §11) ---
  "/dashboard/gettotalmarket": { method: "GET", mock: { total: 0 } },
  "/dashboard/getusersummary": { method: "GET", mock: {} },
  "/dashboard/getlivebettotal": { method: "GET", mock: { total: 0 } },
  "/dashboard/getrecentprofitloss": { method: "GET", mock: { data: [] } },
  "/dashboard/getbetsummary": { method: "GET", mock: {} },
  "/dashboard/getlivebetsummary": { method: "GET", mock: {} },

  // --- Bet (README §4, §5) ---
  "/bet/getlivebets": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },
  "/bethistory/getbethistory": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },
  "/bethistory/getplbymarket": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },
  "/bethistory/getbethistorybymarketid": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },
  "/bethistory/getplbyagent": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },
  "/bethistory/getdownlinesummary": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },
  "/bethistory/getdownlinesummarydetails": {
    method: "POST",
    mock: { data: [], total: 0, page: 1, pageSize: 15 },
  },

  // --- Position (README §7) ---
  "/position/geteventtypeposition": { method: "GET", mock: [] },
  "/position/geteventpositionbyid": { method: "GET", mock: [] },
  "/position/getmarketpositionbyid": { method: "GET", mock: [] },
  "/position/getmarketpositionbymarketid": { method: "GET", mock: [] },

  // --- Market (README §9) ---
  "/managemarket/updatemarketlockstatus": { method: "POST", mock: {} },

  // --- Token / Login history (README §6) ---
  "/token/loginhistory": { method: "GET", mock: [] },
  "/token/loginhistorybyid": { method: "GET", mock: [] },

  // --- User (README §3) ---
  "/user/getmyinfo": { method: "GET", mock: {} },
  "/user/updatemember": { method: "POST", mock: {} },
  "/user/getusercode": { method: "GET", mock: { userCode: "" } },
  "/user/addmember": { method: "POST", mock: {} },
  "/user/changebettinglock": { method: "POST", mock: {} },
  "/user/setcommission": { method: "POST", mock: {} },
  "/user/updatereferralsetting": { method: "POST", mock: {} },

  // --- Event Type (README §8) ---
  "/eventtype/geteventtype": { method: "GET", mock: [] },

  // --- Setting (README §10) ---
  "/setting/getnotifications": {
    method: "GET",
    mock: { text1: "", text2: "" },
  },
  "/setting/updatenotification": { method: "POST", mock: {} },

  // --- Public (README §12, no auth) ---
  "/help": { method: "GET", mock: {} },
  "/start": { method: "GET", mock: {} },
};

/** GET paths with path params (e.g. /account/getbalancedetail/123). Key = path prefix without trailing slash. */
const GET_PATH_PREFIXES: Record<string, Binding> = {
  "account/getbalancedetail": { method: "GET", mock: { balance: 0, chips: 0, cash: 0 } },
  "account/getparentstatus": { method: "GET", mock: {} },
  "account/getinoutactivity": { method: "GET", mock: [] },
  "account/getcasinoactivity": { method: "GET", mock: [] },
  "position/geteventpositionbyid": { method: "GET", mock: [] },
  "position/getmarketpositionbyid": { method: "GET", mock: [] },
  "position/getmarketpositionbymarketid": { method: "GET", mock: [] },
  "position/getfancyuserposition": { method: "GET", mock: [] },
  "token/loginhistorybyid": { method: "GET", mock: [] },
  "user/getmyinfo": { method: "GET", mock: {} },
  "user/getusercode": { method: "GET", mock: { userCode: "" } },
  "user/getuserbyid": { method: "GET", mock: {} },
  "user/checkusername": { method: "GET", mock: { available: true } },
  "user/getreferralsetting": { method: "GET", mock: {} },
  "managemarket/getmarketlockstatus": { method: "GET", mock: { isLock: false } },
  "bethistory/getuseractivity": { method: "GET", mock: {} },
  "bethistory/getplbymarketdetails": { method: "GET", mock: [] },
};

function normalizePath(path: string): string {
  return (path.replace(/^\/+/, "").split("?")[0] ?? "").replace(/\/+$/, "");
}

/**
 * Returns mock for a given path and method when in UI-only mode.
 * POST paths matched by full path; GET with params by prefix.
 */
export function getMockForPath(path: string, method: HttpMethod): unknown {
  const norm = normalizePath(path);
  const exact = API_BINDINGS[norm] ?? API_BINDINGS[`/${norm}`];
  if (exact && exact.method === method) return exact.mock;
  if (method === "GET") {
    for (const [prefix, binding] of Object.entries(GET_PATH_PREFIXES)) {
      if (norm.startsWith(prefix + "/") || norm === prefix) return binding.mock;
    }
  }
  return method === "POST" ? {} : [];
}
