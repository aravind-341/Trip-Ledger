import React, { useMemo, useState } from 'react';
import { Calendar, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatINR } from '../domain/currency';
import { formatExpenseDate } from '../domain/dates';
import type { AppRoute } from '../navigation/router';
import { useTripStore } from '../state/TripContext';

interface ExpenseDetailsScreenProps {
  route: AppRoute;
  tripId: string;
  expenseId: string;
  navigate: (route: AppRoute) => void;
}

export const ExpenseDetailsScreen: React.FC<ExpenseDetailsScreenProps> = ({
  route,
  tripId,
  expenseId,
  navigate,
}) => {
  const { db, deleteExpense, showToast } = useTripStore();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const trip = db.trips.find((t) => t.id === tripId);
  const expense = db.expenses.find(
    (e) => e.id === expenseId && e.tripId === tripId
  );

  const tripMembers = useMemo(
    () => db.members.filter((m) => m.tripId === tripId),
    [db.members, tripId]
  );

  const memberById = useMemo(
    () => new Map(tripMembers.map((m) => [m.id, m])),
    [tripMembers]
  );

  const shares = useMemo(
    () =>
      expense
        ? db.expenseShares.filter((s) => s.expenseId === expense.id)
        : [],
    [db.expenseShares, expense]
  );

  const excludedMembers = useMemo(() => {
    const sharedIds = new Set(shares.map((s) => s.memberId));
    return tripMembers.filter((m) => !sharedIds.has(m.id));
  }, [shares, tripMembers]);

  if (!trip || !expense) {
    return (
      <AppShell
        route={route}
        navigate={navigate}
        title="Expense Details"
        backRoute={
          trip ? { screen: 'trip-details', tripId: trip.id } : { screen: 'home' }
        }
      >
        <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Expense not found.
          </p>
        </div>
      </AppShell>
    );
  }

  const payer = memberById.get(expense.payerMemberId);

  const handleConfirmDelete = () => {
    const result = deleteExpense(expense.id);
    setConfirmDeleteOpen(false);
    if (!result.ok) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`Deleted "${expense.description}".`);
    navigate({ screen: 'trip-details', tripId: trip.id });
  };

  return (
    <AppShell
      route={route}
      navigate={navigate}
      title="Expense Details"
      backRoute={{ screen: 'trip-details', tripId: trip.id }}
      activeTripId={trip.id}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Expense Hero Summary */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formatExpenseDate(expense.expenseDate)}</span>
                <span aria-hidden="true">·</span>
                <span>{trip.name}</span>
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold text-slate-900 dark:text-white break-words">
                {expense.description}
              </h2>
            </div>

            <div className="sm:text-right shrink-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Total Expense
              </p>
              <p className="mt-0.5 font-mono text-3xl font-semibold tabular-nums-ledger text-[#0F2557] dark:text-white">
                {formatINR(expense.amountCents)}
              </p>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {payer && (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    screen: 'member-expenses',
                    tripId: trip.id,
                    memberId: payer.id,
                  })
                }
                className="flex items-center gap-3 text-left group"
              >
                <Avatar name={payer.name} size="sm" />
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Paid by
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#4338CA] dark:group-hover:text-indigo-300 transition-colors">
                    {payer.name}
                  </p>
                </div>
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  navigate({
                    screen: 'edit-expense',
                    tripId: trip.id,
                    expenseId: expense.id,
                  })
                }
                className="flex-1 sm:flex-none min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-[#0F2557] dark:text-indigo-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Pencil className="h-4 w-4" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="flex-1 sm:flex-none min-h-[42px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/70 bg-red-50/70 dark:bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60 transition-colors whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </section>

        {/* Share Breakdown */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80">
            <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
              Individual Shares ({shares.length}{' '}
              {shares.length === 1 ? 'member' : 'members'})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Exact share assigned to each participating friend.
            </p>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {shares.map((share) => {
              const member = memberById.get(share.memberId);
              const pct =
                expense.amountCents > 0
                  ? ((share.amountCents / expense.amountCents) * 100).toFixed(1)
                  : '0.0';

              return (
                <li key={share.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (member) {
                        navigate({
                          screen: 'member-expenses',
                          tripId: trip.id,
                          memberId: member.id,
                        });
                      }
                    }}
                    className="w-full min-h-[60px] px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={member?.name ?? '?'} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {member?.name ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums-ledger">
                          {pct}% of total
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-sm sm:text-base font-semibold tabular-nums-ledger text-slate-900 dark:text-white">
                        {formatINR(share.amountCents)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {excludedMembers.length > 0 && (
            <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/80">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Not sharing (₹0):{' '}
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {excludedMembers.map((m) => m.name).join(', ')}
                </span>
              </p>
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete this expense?"
        description={`"${expense.description}" (${formatINR(
          expense.amountCents
        )}) and all its member shares will be permanently deleted, and trip balances will recalculate immediately.`}
        confirmLabel="Delete Expense"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </AppShell>
  );
};
