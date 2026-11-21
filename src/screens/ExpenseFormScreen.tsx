import React, { useMemo } from 'react';
import { AppShell } from '../components/AppShell';
import { ExpenseForm } from '../components/ExpenseForm';
import type { AppRoute } from '../navigation/router';
import { useTripStore } from '../state/TripContext';
import type { ExpenseInput } from '../types/models';

interface ExpenseFormScreenProps {
  route: AppRoute;
  tripId: string;
  expenseId?: string;
  navigate: (route: AppRoute) => void;
}

export const ExpenseFormScreen: React.FC<ExpenseFormScreenProps> = ({
  route,
  tripId,
  expenseId,
  navigate,
}) => {
  const { db, addExpense, updateExpense, showToast } = useTripStore();

  const trip = db.trips.find((t) => t.id === tripId);
  const members = useMemo(
    () => db.members.filter((m) => m.tripId === tripId),
    [db.members, tripId]
  );

  const isEditMode = Boolean(expenseId);
  const existingExpense = expenseId
    ? db.expenses.find((e) => e.id === expenseId && e.tripId === tripId)
    : undefined;
  const existingShares = useMemo(
    () =>
      existingExpense
        ? db.expenseShares.filter((s) => s.expenseId === existingExpense.id)
        : [],
    [db.expenseShares, existingExpense]
  );

  if (!trip || (isEditMode && !existingExpense)) {
    return (
      <AppShell
        route={route}
        navigate={navigate}
        title={isEditMode ? 'Edit Expense' : 'Add Expense'}
        backRoute={{ screen: 'home' }}
      >
        <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {isEditMode ? 'Expense not found.' : 'Trip not found.'}
          </p>
        </div>
      </AppShell>
    );
  }

  const backRoute: AppRoute =
    isEditMode && existingExpense
      ? {
          screen: 'expense-details',
          tripId: trip.id,
          expenseId: existingExpense.id,
        }
      : { screen: 'trip-details', tripId: trip.id };

  const handleSubmit = (input: ExpenseInput): string | null => {
    if (isEditMode && existingExpense) {
      const result = updateExpense(existingExpense.id, input);
      if (!result.ok) return result.error;
      showToast('Expense updated.');
      navigate({
        screen: 'expense-details',
        tripId: trip.id,
        expenseId: existingExpense.id,
      });
      return null;
    }

    const result = addExpense(input);
    if (!result.ok) return result.error;
    showToast(`Added "${result.value.description}".`);
    navigate({ screen: 'trip-details', tripId: trip.id });
    return null;
  };

  return (
    <AppShell
      route={route}
      navigate={navigate}
      title={isEditMode ? 'Edit Expense' : 'Add Expense'}
      backRoute={backRoute}
      activeTripId={trip.id}
    >
      <div className="max-w-3xl mx-auto">
        <ExpenseForm
          key={existingExpense?.id ?? 'new-expense'}
          tripId={trip.id}
          members={members}
          existingExpense={existingExpense}
          existingShares={existingShares}
          submitLabel={isEditMode ? 'Save Changes' : 'Save Expense'}
          onSubmit={handleSubmit}
          onCancel={() => navigate(backRoute)}
          onAddMembersClick={() =>
            navigate({ screen: 'trip-members', tripId: trip.id })
          }
        />
      </div>
    </AppShell>
  );
};
