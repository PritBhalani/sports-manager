import { redirect } from "next/navigation";

/** Legacy URL — canonical provider pages live under /sports/{provider}. */
export default function LegacyBetsMarketsRedirect() {
  redirect("/sports/spm-sports");
}
