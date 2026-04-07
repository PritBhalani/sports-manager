"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  PageHeader,
  ListPageFrame,
  Button,
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmpty,
  TablePagination,
} from "@/components";
import {
  getDwTransaction,
  getBonusTransaction,
  b2cSummaryRowToDwFromDateIso,
  type BonusTransactionRow,
  type DwTransactionRow,
} from "@/services/account.service";
import type { B2cTransactionsQueryKind } from "@/utils/b2cTransactionRoutes";
import { formatCurrency } from "@/utils/formatCurrency";
import { downloadCsv } from "@/utils/csvDownload";
import {
  formatB2cReportTitleDate,
  formatDwDateTimeIST,
  dwDescriptionLine,
  formatBonusTurnoverPair,
  bonusCodeCell,
  bonusAmountCell,
  bonusExpireIso,
  BONUS_CTO_KEYS,
  BONUS_RTO_KEYS,
  BONUS_CWTO_KEYS,
  BONUS_RWTO_KEYS,
} from "@/utils/b2cTransactionReportFormat";

const PAGE_SIZE = 50;

const reportTh =
  "px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-emerald-600";
const reportThRight = `${reportTh} text-right`;

function buildPageTitle(args: {
  kind: B2cTransactionsQueryKind;
  dwType: string;
  agent: string;
  titleDate: string;
}): string {
  const { kind, dwType, agent, titleDate } = args;
  if (kind === "dw") {
    const t = dwType === "D" ? "Deposit" : "Withdrawal";
    return `${t} Transaction Report Of ${agent}, Date ${titleDate}`;
  }
  const prefix =
    dwType === "A"
      ? "Activated Bonus"
      : dwType === "R"
        ? "Redeemed Bonus"
        : dwType === "E"
          ? "Expired Bonus"
          : "Bonus";
  return `${prefix} Report Of ${agent}, Date ${titleDate}`;
}

export default function B2cTransactionsClient(props: {
  kind: B2cTransactionsQueryKind;
  dwType: string;
}) {
  const { kind, dwType } = props;
  const searchParams = useSearchParams();
  const summaryId = searchParams.get("summaryId")?.trim() ?? "";
  const userId = searchParams.get("userId")?.trim() ?? "";
  const agentName = searchParams.get("agentName")?.trim() ?? "";
  const dateRaw = searchParams.get("date")?.trim() ?? "";

  const valid =
    summaryId &&
    userId &&
    agentName &&
    dateRaw &&
    (kind === "dw"
      ? dwType === "D" || dwType === "W"
      : dwType === "A" || dwType === "R" || dwType === "E");

  const titleDate = dateRaw ? formatB2cReportTitleDate(dateRaw) : "—";
  const pageTitle = valid
    ? buildPageTitle({ kind, dwType, agent: agentName, titleDate })
    : "B2C transactions";

  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dwItems, setDwItems] = useState<DwTransactionRow[]>([]);
  const [bonusItems, setBonusItems] = useState<BonusTransactionRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    setPage(1);
  }, [summaryId, userId, agentName, dateRaw, kind, dwType]);

  useEffect(() => {
    if (!valid) {
      setLoading(false);
      setError(null);
      setDwItems([]);
      setBonusItems([]);
      setTotalCount(0);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fromDateIso = b2cSummaryRowToDwFromDateIso(dateRaw);
    const baseParams = {
      page,
      pageSize: PAGE_SIZE,
      groupBy: "",
      orderBy: "",
      orderByDesc: false,
    };
    const searchBase = {
      b2CSummaryId: summaryId,
      userId,
      fromDate: fromDateIso,
      agentName,
    };

    const req =
      kind === "dw"
        ? getDwTransaction(baseParams, {
            ...searchBase,
            dwType: dwType as "D" | "W",
          })
        : getBonusTransaction(baseParams, {
            ...searchBase,
            dwType: dwType as "A" | "R" | "E",
          });

    req
      .then((res) => {
        if (cancelled) return;
        if (kind === "dw") {
          setDwItems(res.items as DwTransactionRow[]);
          setBonusItems([]);
        } else {
          setBonusItems(res.items as BonusTransactionRow[]);
          setDwItems([]);
        }
        setTotalCount(res.total);
      })
      .catch((e) => {
        if (cancelled) return;
        setDwItems([]);
        setBonusItems([]);
        setTotalCount(0);
        setError(e instanceof Error ? e.message : "Failed to load report.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    valid,
    kind,
    dwType,
    summaryId,
    userId,
    agentName,
    dateRaw,
    page,
    refreshKey,
  ]);

  const exportTransactionsCsv = useCallback(() => {
    if (kind === "dw") {
      const header = ["User", "Description", "Amount", "Date"];
      const out = dwItems.map((line) => {
        const u = line.user;
        const un = String(u?.username ?? "").trim();
        const mob = String(u?.mobile ?? "").trim();
        const userCell =
          un || mob ? `${un}${mob ? ` (${mob})` : ""}` : "—";
        return [
          userCell,
          dwDescriptionLine(line),
          Number(line.balance ?? 0),
          formatDwDateTimeIST(line.createdOn),
        ];
      });
      downloadCsv(`b2c-transactions-${dwType}-${dateRaw}.csv`, header, out);
      return;
    }
    const header = [
      "User",
      "Bonus code",
      "CTO/RTO",
      "CWTO/RWTO",
      "Amount",
      "Created date",
      "Expiring date",
    ];
    const out = bonusItems.map((line) => {
      const u = line.user;
      const un = String(u?.username ?? "").trim();
      const mob = String(u?.mobile ?? "").trim();
      const userCell =
        un || mob ? `${un}${mob ? ` (${mob})` : ""}` : "—";
      const exp = bonusExpireIso(line);
      return [
        userCell,
        bonusCodeCell(line),
        formatBonusTurnoverPair(line, BONUS_CTO_KEYS, BONUS_RTO_KEYS),
        formatBonusTurnoverPair(line, BONUS_CWTO_KEYS, BONUS_RWTO_KEYS),
        bonusAmountCell(line),
        formatDwDateTimeIST(line.createdOn),
        exp ? formatDwDateTimeIST(exp) : "—",
      ];
    });
    downloadCsv(`b2c-bonus-${dwType}-${dateRaw}.csv`, header, out);
  }, [kind, dwType, dateRaw, dwItems, bonusItems]);

  if (!valid) {
    return (
      <div className="min-w-0 space-y-4">
        <PageHeader
          title={pageTitle}
          breadcrumbs={["Reports", "B2C Summary", "Transactions"]}
          action={
            <Link
              href="/reports/b2c-summary"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-foreground-secondary hover:bg-surface-muted"
            >
              Back to B2C Summary
            </Link>
          }
        />
        <ListPageFrame>
          <p className="p-4 text-sm text-error" role="alert">
            Invalid or incomplete link. Open this report from the B2C Summary table
            (deposit, withdrawal, or bonus amounts).
          </p>
        </ListPageFrame>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title={pageTitle}
        breadcrumbs={["Reports", "B2C Summary", "Transactions"]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/reports/b2c-summary"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-3 text-sm font-medium text-foreground-secondary hover:bg-surface-muted"
            >
              Back to B2C Summary
            </Link>
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={exportTransactionsCsv}
              disabled={
                loading ||
                (kind === "dw" ? dwItems.length === 0 : bonusItems.length === 0)
              }
            >
              Download CSV
            </Button>
          </div>
        }
      />

      <ListPageFrame>
        <div className="flex flex-col gap-4 p-4">
          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          {kind === "dw" ? (
            <Table className="min-w-[640px]">
              <TableHeader className="bg-surface-2">
                <TableHead className={`${reportTh} min-w-[10rem]`}>User</TableHead>
                <TableHead className={`${reportTh} min-w-[12rem]`}>Description</TableHead>
                <TableHead className={`${reportThRight} min-w-[6rem]`} align="right">
                  Amount
                </TableHead>
                <TableHead className={`${reportThRight}`} align="right">
                  Date
                </TableHead>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableEmpty colSpan={4} message="Loading…" />
                ) : dwItems.length === 0 ? (
                  <TableEmpty
                    colSpan={4}
                    message={error ? "\u00a0" : "No transactions for this filter."}
                  />
                ) : (
                  dwItems.map((line, idx) => {
                    const u = line.user;
                    const un = String(u?.username ?? "").trim();
                    const mob = String(u?.mobile ?? "").trim();
                    const playerId = String(line.userId ?? "").trim();
                    const userCell =
                      un || mob ? `${un}${mob ? ` (${mob})` : ""}` : "—";
                    const bal = Number(line.balance ?? 0);
                    return (
                      <TableRow key={`${line.userId ?? un}-${line.createdOn ?? idx}`}>
                        <TableCell className="font-medium">
                          {playerId ? (
                            <Link
                              href={`/players/${encodeURIComponent(playerId)}`}
                              className="text-sky-600 hover:underline"
                            >
                              {userCell}
                            </Link>
                          ) : (
                            <span className="text-sky-600">{userCell}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[240px] text-foreground">
                          {dwDescriptionLine(line)}
                        </TableCell>
                        <TableCell
                          align="right"
                          className={`tabular-nums ${bal < 0 ? "text-error" : "text-foreground"}`}
                        >
                          {formatCurrency(line.balance ?? 0)}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-foreground-secondary">
                          {formatDwDateTimeIST(line.createdOn)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          ) : (
            <Table className="min-w-[900px]">
              <TableHeader className="bg-surface-2">
                <TableHead className={reportTh}>User</TableHead>
                <TableHead className={reportTh}>Bonus code</TableHead>
                <TableHead className={reportTh}>CTO/RTO</TableHead>
                <TableHead className={reportTh}>CWTO/RWTO</TableHead>
                <TableHead className={`${reportThRight}`} align="right">
                  Amount
                </TableHead>
                <TableHead className={`${reportThRight}`} align="right">
                  Created date
                </TableHead>
                <TableHead className={`${reportThRight}`} align="right">
                  Expiring date
                </TableHead>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableEmpty colSpan={7} message="Loading…" />
                ) : bonusItems.length === 0 ? (
                  <TableEmpty
                    colSpan={7}
                    message={
                      error ? "\u00a0" : "No bonus transactions for this filter."
                    }
                  />
                ) : (
                  bonusItems.map((line, idx) => {
                    const u = line.user;
                    const un = String(u?.username ?? "").trim();
                    const mob = String(u?.mobile ?? "").trim();
                    const playerId = String(line.userId ?? "").trim();
                    const userCell =
                      un || mob ? `${un}${mob ? ` (${mob})` : ""}` : "—";
                    const exp = bonusExpireIso(line);
                    return (
                      <TableRow
                        key={`${line.userId ?? un}-${line.createdOn ?? exp ?? idx}`}
                      >
                        <TableCell className="font-medium">
                          {playerId ? (
                            <Link
                              href={`/players/${encodeURIComponent(playerId)}`}
                              className="text-sky-600 hover:underline"
                            >
                              {userCell}
                            </Link>
                          ) : (
                            <span className="text-sky-600">{userCell}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[140px] text-foreground">
                          {bonusCodeCell(line)}
                        </TableCell>
                        <TableCell className="tabular-nums text-foreground">
                          {formatBonusTurnoverPair(line, BONUS_CTO_KEYS, BONUS_RTO_KEYS)}
                        </TableCell>
                        <TableCell className="tabular-nums text-foreground">
                          {formatBonusTurnoverPair(
                            line,
                            BONUS_CWTO_KEYS,
                            BONUS_RWTO_KEYS,
                          )}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-foreground">
                          {bonusAmountCell(line)}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-foreground-secondary">
                          {formatDwDateTimeIST(line.createdOn)}
                        </TableCell>
                        <TableCell align="right" className="tabular-nums text-foreground-secondary">
                          {exp ? formatDwDateTimeIST(exp) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}

          {!loading && totalCount > PAGE_SIZE ? (
            <TablePagination
              page={page}
              totalItems={totalCount}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      </ListPageFrame>
    </div>
  );
}
