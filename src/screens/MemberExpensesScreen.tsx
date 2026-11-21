import React, { useMemo, useState } from 'react';
import { ChevronRight, Receipt } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Avatar } from '../components/Avatar';
import { formatINR } from '../domain/currency';
import { formatExpenseDate } from '../domain/dates';
import {
  calculateMemberBalances,
  getMemberExpenseLedger,
} from '../domain/settlement';
import type { AppRoute } from '../navigation/router';
import { useTripStore } from '../state/TripContext';

interface MemberExpensesScreenProps {
  route: AppRoute;
  tripId: string;
  memberId: string;
  navigate: (route: AppRoute) => void;
}

export const MemberExpensesScreen: React.FC<MemberExpensesScreenProps> = ({
  route,
  tripId,
  memberId,
  navigate,
}) => {
  const { db } = useTripStore();
  const [viewFilter, setViewFilter] = useState<'all' | 'paid' | 'shared'>('all');

  const trip = db.trips.find((t) => t.id === tripId);
  const member = db.members.find((m) => m.id === memberId && m.tripId === tripId);

  const memberBalance = useMemo(() => {
    const all = calculateMemberBalances(db, tripId);
    return all.find((b) => b.memberId === memberId);
  }, [db, tripId, memberId]);

  const ledger = useMemo(
    () => getMemberExpenseLedger(db, tripId, memberId),
    [db, tripId, memberId]
  );

  const paidEntries = useMemo(() => ledger.filter((e) => e.isPayer), [ledger]);
  const sharedEntries = useMemo(() => ledger.filter((e) => e.isSharer), [ledger]);

  const displayedEntries = useMemo(() => {
    if (viewFilter === 'paid') return paidEntries;
    if (viewFilter === 'shared') return sharedEntries;
    return ledger;
  }, [viewFilter, paidEntries, sharedEntries, ledger]);

  if (!trip || !member || !memberBalance) {
    return (
      <AppShell
        route={route}
        navigate={navigate}
        title="Member Expenses"
        backRoute={
          trip ? { screen: 'trip-details', tripId: trip.id } : { screen: 'home' }
        }
      >
        <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Member not found in this trip.
          </p>
        </div>
      </AppShell>
    );
  }

  const netColor =
    memberBalance.netBalanceCents > 0
      ? 'text-emerald-700 dark:text-emerald-400'
      : memberBalance.netBalanceCents < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-slate-700 dark:text-slate-300';

  const netLabel =
    memberBalance.netBalanceCents > 0
      ? 'Should receive'
      : memberBalance.netBalanceCents < 0
      ? 'Needs to pay'
      : 'Settled';

  return (
    <AppShell
      route={route}
      navigate={navigate}
      title={member.name}
      backRoute={{ screen: 'trip-details', tripId: trip.id }}
      activeTripId={trip.id}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Member Financial Position Card */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-6">
          <div className="flex items-center gap-4">
            <Avatar name={member.name} size="lg" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Person-wise Ledger · {trip.name}
              </p>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                {member.name}
              </h2>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Paid
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums-ledger text-slate-900 dark:text-white">
                {formatINR(memberBalance.totalPaidCents)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {paidEntries.length}{' '}
                {paidEntries.length === 1 ? 'expense' : 'expenses'} paid
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Assigned Share
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums-ledger text-slate-900 dark:text-white">
                {formatINR(memberBalance.totalShareCents)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {sharedEntries.length}{' '}
                {sharedEntries.length === 1 ? 'expense' : 'expenses'} shared
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Net Balance
              </p>
              <p
                className={`mt-1 font-mono text-2xl font-semibold tabular-nums-ledger ${netColor}`}
              >
                {formatINR(memberBalance.netBalanceCents, { showSign: true })}
              </p>
              <p className={`mt-0.5 text-xs font-semibold ${netColor}`}>
                {netLabel}
              </p>
            </div>
          </div>
        </section>

        {/* Filtered Member Expenses */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Related Expenses
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Only expenses paid or shared by {member.name}. Unrelated trip expenses are excluded.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Filter member expenses"
              className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 self-start sm:self-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewFilter === 'all'}
                onClick={() => setViewFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  viewFilter === 'all'
                    ? 'bg-white dark:bg-[#131C31] text-[#0F2557] dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All ({ledger.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewFilter === 'paid'}
                onClick={() => setViewFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  viewFilter === 'paid'
                    ? 'bg-white dark:bg-[#131C31] text-[#0F2557] dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Paid ({paidEntries.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewFilter === 'shared'}
                onClick={() => setViewFilter('shared')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                  viewFilter === 'shared'
                    ? 'bg-white dark:bg-[#131C31] text-[#0F2557] dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Shared ({sharedEntries.length})
              </button>
            </div>
          </div>

          {displayedEntries.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Receipt className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                No expenses in this category
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {ledger.length === 0
                  ? `${member.name} has not paid or shared any expenses in this trip yet.`
                  : 'Switch tabs above to inspect other related expenses.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 pl-5 pr-3">Date & Description</th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">
                      Amount Paid
                    </th>
                    <th className="py-3 px-3 text-right whitespace-nowrap">
                      Individual Share
                    </th>
                    <th className="py-3 pl-2 pr-4 w-8" aria-label="Details" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {displayedEntries.map((entry) => (
                    <tr
                      key={entry.expense.id}
                      onClick={() =>
                        navigate({
                          screen: 'expense-details',
                          tripId: trip.id,
                          expenseId: entry.expense.id,
                        })
                      }
                      className="cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 pl-5 pr-3">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {entry.expense.description}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {formatExpenseDate(entry.expense.expenseDate)} · Paid by{' '}
                          {entry.payerName} · Total{' '}
                          {formatINR(entry.expense.amountCents)}
                        </p>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums-ledger whitespace-nowrap">
                        {entry.paidByMemberCents > 0 ? (
                          <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                            {formatINR(entry.paidByMemberCents)}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">
                            ₹0
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-sm tabular-nums-ledger whitespace-nowrap">
                        {entry.memberShareCents > 0 ? (
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {formatINR(entry.memberShareCents)}
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">
                            ₹0
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pl-2 pr-4 text-right">
                        <ChevronRight className="inline h-4 w-4 text-slate-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
};
