import { redirect } from "next/navigation";

/** Default request tab — deposit */
export default function TransactionsRequestsIndexPage() {
  redirect("/transactions/requests/deposit");
}
