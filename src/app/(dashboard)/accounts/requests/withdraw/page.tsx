import { redirect } from "next/navigation";

/** Legacy URL — use /transactions/requests/withdraw */
export default function LegacyAccountsRequestWithdrawRedirect() {
  redirect("/transactions/requests/withdraw");
}
