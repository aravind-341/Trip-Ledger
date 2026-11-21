import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Copy,
  Plus,
  Receipt,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Avatar } from '../components/Avatar';
import { formatINR } from '../domain/currency';
import {
  calculateMemberBalances,
  calculateSettlementTransfers,
  formatSettlementSummaryText,
  getTripTotalCents,
} from '../domain/settlement';
import type { AppRoute } from '../navigation/router';
import { useTripStore } from '../state/TripContext';

interface SettlementScreenProps {
  route: AppRoute;
  tripId: string;
  navigate: (route: AppRoute) => void;
}

export const SettlementScreen: React.FC<SettlementScreenProps> = ({
  route,
  tripId,
  navigate,
}) => {
  const { db, showToast } = useTripStore();
  const [copied, setCopied] = useState(false);

  const trip = db.trips.find((t) => t.id === tripId);
  const tripExpenses = useMemo(
    () => db.expenses.filter((e) => e.tripId === tripId),
    [db.expenses, tripId]
  );

  const balances = useMemo(
    () => calculateMemberBalances(db, tripId),
    [db, tripId]
  );

  const transfers = useMemo(
    () => calculateSettlementTransfers(balances),
    [balances]
  );

  const totalExpenseCents = useMemo(
    () => getTripTotalCents(db, tripId),
    [db, tripId]
  );

  if (!trip) {
    return (
      <AppShell
        route={route}
        navigate={navigate}
        title="Settlement"
        backRoute={{ screen: 'home' }}
      >
        <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">Trip not found.</p>
        </div>
      </AppShell>
    );
  }

  const handleCopySummary = async () => {
    const text = formatSettlementSummaryText(
      trip,
      balances,
      transfers,
      totalExpenseCents
    );

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      showToast('Settlement summary copied to clipboard.');
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Could not access clipboard on this device.', 'error');
    }
  };

  return (
    <AppShell
      route={route}
      navigate={navigate}
      title="Settlement"
      backRoute={{ screen: 'trip-details', tripId: trip.id }}
      activeTripId={trip.id}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {tripExpenses.length === 0 ? (
          <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F2557]/8 dark:bg-indigo-500/15 text-[#0F2557] dark:text-indigo-300">
              <Receipt className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">
              Add expenses to calculate settlement
            </h2>
            <p className="mt-1.5 max-w-md mx-auto text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              There are no expenses recorded for {trip.name} yet. Record your trip expenses first so the organizer can see member balances and who needs to pay whom.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() =>
                  navigate({ screen: 'add-expense', tripId: trip.id })
                }
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173473] dark:hover:bg-[#4F46E5] transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add First Expense</span>
              </button>
            </div>
          </section>
        ) : (
          <>
            {/* Section 1: Settlement Summary */}
            <section className="rounded-2xl bg-[#0F2557] dark:bg-[#131C31] dark:border dark:border-slate-800 text-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-indigo-200 dark:text-indigo-300">
                    Settlement Summary · {trip.name}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-bold text-white">
                    Final Group Reconciliation
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void handleCopySummary();
                  }}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#0F2557] hover:bg-slate-100 dark:bg-[#4338CA] dark:text-white dark:hover:bg-[#4F46E5] px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                      <span>Copied Summary</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span>Copy Settlement Summary</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div>
                  <p className="text-xs text-indigo-200/90 dark:text-slate-400">
                    Total Group Expenses
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold tabular-nums-ledger text-white">
                    {formatINR(totalExpenseCents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-indigo-200/90 dark:text-slate-400">
                    Number of Members
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums-ledger text-white">
                    {balances.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-indigo-200/90 dark:text-slate-400">
                    Suggested Payments
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold tabular-nums-ledger text-white">
                    {transfers.length}
                  </p>
                </div>
              </div>
            </section>

            {/* Section 2: Who Pays Whom */}
            <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 sm:px-6 border-b border-slate-100 dark:border-slate-800/80">
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Who Pays Whom
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Suggested payments that bring every member’s net balance to ₹0.
                </p>
              </div>

              {transfers.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h4 className="mt-3 font-display text-base font-bold text-slate-900 dark:text-white">
                    Everyone is completely settled!
                  </h4>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Every member’s total paid equals their assigned share. No payments are required.
                  </p>
                </div>
              ) : (
                <ol className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {transfers.map((transfer, idx) => (
                    <li
                      key={`${transfer.fromMemberId}-${transfer.toMemberId}-${idx}`}
                      className="px-5 py-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-slate-400 dark:text-slate-500 w-5 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={transfer.fromMemberName} size="sm" />
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {transfer.fromMemberName}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <span>pays</span>
                          <ArrowRight className="h-3.5 w-3.5 text-[#4338CA] dark:text-indigo-400" />
                        </span>
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar name={transfer.toMemberName} size="sm" />
                          <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {transfer.toMemberName}
                          </span>
                        </div>
                      </div>

                      <div className="pl-8 sm:pl-0 shrink-0">
                        <span className="font-mono text-lg font-semibold tabular-nums-ledger text-[#0F2557] dark:text-indigo-200">
                          {formatINR(transfer.amountCents)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {/* Section 3: Member Balances */}
            <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 sm:px-6 border-b border-slate-100 dark:border-slate-800/80">
                <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Member Balances
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Net Balance = Total Paid − Total Share. Select any member for their full breakdown.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <th className="py-3 pl-5 sm:pl-6 pr-3">Member</th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">
                        Total Paid
                      </th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">
                        Total Share
                      </th>
                      <th className="py-3 px-3 text-right whitespace-nowrap">
                        Net Balance
                      </th>
                      <th className="py-3 pl-2 pr-4 w-8" aria-label="Details" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {balances.map((b) => {
                      const netColor =
                        b.netBalanceCents > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : b.netBalanceCents < 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-slate-500 dark:text-slate-400';

                      const statusText =
                        b.netBalanceCents > 0
                          ? 'Receives'
                          : b.netBalanceCents < 0
                          ? 'Owes'
                          : 'Settled';

                      return (
                        <tr
                          key={b.memberId}
                          onClick={() =>
                            navigate({
                              screen: 'member-expenses',
                              tripId: trip.id,
                              memberId: b.memberId,
                            })
                          }
                          className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 pl-5 sm:pl-6 pr-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar name={b.memberName} size="sm" />
                              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                {b.memberName}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums-ledger text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatINR(b.totalPaidCents)}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums-ledger text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatINR(b.totalShareCents)}
                          </td>
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <p
                              className={`font-mono text-sm font-semibold tabular-nums-ledger ${netColor}`}
                            >
                              {formatINR(b.netBalanceCents, { showSign: true })}
                            </p>
                            <p className={`text-[11px] font-medium ${netColor}`}>
                              {statusText}
                            </p>
                          </td>
                          <td className="py-3.5 pl-2 pr-4 text-right">
                            <ChevronRight className="inline h-4 w-4 text-slate-400" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
};
