"use client";
import { PageHeader, Card } from "@/components";
import { formatCurrency } from "@/utils/formatCurrency";
import { getAuthSession } from "@/store/authStore";

export default function WebsiteCurrencyPage() {
  const session = getAuthSession();
  const currency = session.currency;

  return (
    <div className="min-w-0">
      <PageHeader
        title="Website | Currency"
        breadcrumbs={["Website", "Currency"]}
      />

      <Card title="Currency info" className="mt-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-sm border border-border bg-surface px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Currency
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {currency?.code ?? currency?.name ?? "—"}
            </p>
            {currency?.name &&
              currency?.code &&
              currency.name !== currency.code && (
                <p className="mt-1 text-xs text-foreground-tertiary">{currency.name}</p>
              )}
          </div>

          <div className="rounded-sm border border-border bg-surface px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Rate
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {typeof currency?.rate === "number" && currency.rate !== 0
                ? formatCurrency(currency.rate)
                : "—"}
            </p>
          </div>

          <div className="rounded-sm border border-border bg-surface px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Fractional
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {typeof (currency as { fractional?: number })?.fractional === "number" &&
              (currency as { fractional?: number }).fractional !== 0
                ? String((currency as { fractional?: number }).fractional)
                : "—"}
            </p>
          </div>

          <div className="rounded-sm border border-border bg-surface px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              Primary
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {(currency as { isPrimary?: boolean })?.isPrimary ? "Yes" : "—"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
