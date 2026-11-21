import React, { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Plus,
  Receipt,
  Settings,
  UserPlus,
  Users,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Avatar } from '../components/Avatar';
import { formatINR } from '../domain/currency';
import { formatCreatedDate, formatExpenseDate } from '../domain/dates';
import { calculateMemberBalances, getTripTotalCents } from '../domain/settlement';
import type { AppRoute } from '../navigation/router';
import { useTripStore } from '../state/TripContext';

interface TripDetailsScreenProps {
  route: AppRoute;
  tripId: string;
  navigate: (route: AppRoute) => void;
}

export const TripDetailsScreen: React.FC<TripDetailsScreenProps> = ({
  route,
  tripId,
  navigate,
}) => {
  const { db } = useTripStore();
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const trip = db.trips.find((t) => t.id === tripId);

  const tripMembers = useMemo(
    () => db.members.filter((m) => m.tripId === tripId),
    [db.members, tripId]
  );

  const memberNameById = useMemo(
    () => new Map(tripMembers.map((m) => [m.id, m.name])),
    [tripMembers]
  );

  const balances = useMemo(
    () => calculateMemberBalances(db, tripId),
    [db, tripId]
  );

  const totalCents = useMemo(() => getTripTotalCents(db, tripId), [db, tripId]);

  const sortedExpenses = useMemo(() => {
    const list = db.expenses.filter((e) => e.tripId === tripId);
    return [...list].sort((a, b) => {
      const dateCmp =
        sortOrder === 'newest'
          ? b.expenseDate.localeCompare(a.expenseDate)
          : a.expenseDate.localeCompare(b.expenseDate);
      if (dateCmp !== 0) return dateCmp;
      return sortOrder === 'newest'
        ? b.id.localeCompare(a.id)
        : a.id.localeCompare(b.id);
    });
  }, [db.expenses, tripId, sortOrder]);

  const shareCountByExpense = useMemo(() => {
    const map = new Map<string, number>();
    for (const share of db.expenseShares) {
      map.set(share.expenseId, (map.get(share.expenseId) ?? 0) + 1);
    }
    return map;
  }, [db.expenseShares]);

  if (!trip) {
    return (
      <AppShell
        route={route}
        navigate={navigate}
        title="Trip Not Found"
        backRoute={{ screen: 'home' }}
      >
        <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800 p-8 text-center">
          <h2 className="font-display text-lg font-bold">This trip no longer exists</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            It may have been deleted from your device storage.
          </p>
          <button
            type="button"
            onClick={() => navigate({ screen: 'home' })}
            className="mt-5 min-h-[44px] px-5 py-2 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] text-sm font-semibold text-white"
          >
            Back to Dashboard
          </button>
        </div>
      </AppShell>
    );
  }

  const headerAction = (
    <button
      type="button"
      onClick={() => navigate({ screen: 'add-expense', tripId: trip.id })}
      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#173473] dark:hover:bg-[#4F46E5] transition-colors whitespace-nowrap shrink-0"
    >
      <Plus className="h-4 w-4 shrink-0" />
      <span>Add Expense</span>
    </button>
  );

  return (
    <AppShell
      route={route}
      navigate={navigate}
      title={trip.name}
      backRoute={{ screen: 'home' }}
      activeTripId={trip.id}
      headerAction={headerAction}
    >
      <div className="space-y-6">
        {/* Trip Summary Banner */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {trip.status === 'settled' ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Settled
                  </span>
                ) : (
                  <span className="font-semibold text-[#4338CA] dark:text-indigo-300">
                    Active Trip
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span>Created {formatCreatedDate(trip.createdAt)}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {tripMembers.length}{' '}
                  {tripMembers.length === 1 ? 'member' : 'members'}
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500 dark:text-slate-400">
                Total Trip Expenditure
              </p>
              <p className="mt-0.5 font-mono text-3xl sm:text-4xl font-semibold tabular-nums-ledger text-[#0F2557] dark:text-white">
                {formatINR(totalCents)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  navigate({ screen: 'add-expense', tripId: trip.id })
                }
                className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173473] dark:hover:bg-[#4F46E5] transition-colors whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>Add Expense</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate({ screen: 'settlement', tripId: trip.id })
                }
                className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-[#0F2557] dark:text-indigo-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Calculator className="h-4 w-4" />
                <span>Settlement</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate({ screen: 'trip-settings', tripId: trip.id })
                }
                aria-label="Trip settings"
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Two-column layout on desktop: Members Panel + Expense History */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Trip Members & Quick Person-Wise Navigation */}
          <section className="lg:col-span-4 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Members
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tap a friend to view their expenses
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate({ screen: 'trip-members', tripId: trip.id })
                }
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[#4338CA] dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Manage</span>
              </button>
            </div>

            {tripMembers.length === 0 ? (
              <div className="p-6 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-2.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  No friends added yet
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Add trip members before recording expenses.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    navigate({ screen: 'trip-members', tripId: trip.id })
                  }
                  className="mt-4 min-h-[42px] inline-flex items-center gap-1.5 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-4 py-2 text-xs font-semibold text-white hover:bg-[#173473] transition-colors"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Add Members</span>
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {balances.map((b) => {
                  const balanceColor =
                    b.netBalanceCents > 0
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : b.netBalanceCents < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-slate-500 dark:text-slate-400';

                  const balanceHint =
                    b.netBalanceCents > 0
                      ? 'To receive'
                      : b.netBalanceCents < 0
                      ? 'To pay'
                      : 'Settled';

                  return (
                    <li key={b.memberId}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            screen: 'member-expenses',
                            tripId: trip.id,
                            memberId: b.memberId,
                          })
                        }
                        className="w-full min-h-[60px] px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={b.memberName} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {b.memberName}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums-ledger">
                              Paid {formatINR(b.totalPaidCents)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 text-right">
                          <div>
                            <p
                              className={`font-mono text-sm font-semibold tabular-nums-ledger ${balanceColor}`}
                            >
                              {formatINR(b.netBalanceCents, { showSign: true })}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {balanceHint}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Expense History List */}
          <section className="lg:col-span-8 rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                  Expense History
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {sortedExpenses.length}{' '}
                  {sortedExpenses.length === 1 ? 'expense' : 'expenses'} recorded
                </p>
              </div>

              {sortedExpenses.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setSortOrder((prev) =>
                      prev === 'newest' ? 'oldest' : 'newest'
                    )
                  }
                  className="min-h-[38px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <ArrowDownUp className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
                  </span>
                </button>
              )}
            </div>

            {sortedExpenses.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Receipt className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
                <h3 className="mt-3 font-display text-base font-bold text-slate-900 dark:text-white">
                  No expenses logged yet
                </h3>
                <p className="mt-1.5 max-w-sm mx-auto text-sm text-slate-500 dark:text-slate-400">
                  {tripMembers.length === 0
                    ? 'First add friends to this trip, then start recording shared expenses.'
                    : 'Record hotel stays, meals, fuel, or activities and assign custom shares per friend.'}
                </p>
                <div className="mt-5">
                  {tripMembers.length === 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        navigate({ screen: 'trip-members', tripId: trip.id })
                      }
                      className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173473]"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add Members First</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        navigate({ screen: 'add-expense', tripId: trip.id })
                      }
                      className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173473]"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Record First Expense</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {sortedExpenses.map((expense) => {
                  const payerName =
                    memberNameById.get(expense.payerMemberId) ?? 'Unknown';
                  const shareCount = shareCountByExpense.get(expense.id) ?? 0;

                  return (
                    <li key={expense.id}>
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            screen: 'expense-details',
                            tripId: trip.id,
                            expenseId: expense.id,
                          })
                        }
                        className="w-full min-h-[72px] px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-left"
                      >
                        <div className="min-w-0">
                          <p className="font-display text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                            {expense.description}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            <span>{formatExpenseDate(expense.expenseDate)}</span>
                            <span aria-hidden="true">·</span>
                            <span>Paid by {payerName}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Shared by {shareCount}{' '}
                              {shareCount === 1 ? 'member' : 'members'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-base font-semibold tabular-nums-ledger text-[#0F2557] dark:text-white">
                            {formatINR(expense.amountCents)}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
};
