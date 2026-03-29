import { redirect } from "next/navigation";

/** Legacy URL — use /transactions/requests/deposit */
export default function LegacyAccountsRequestDepositRedirect() {
  redirect("/transactions/requests/deposit");
}
