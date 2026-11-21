import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatCreatedDate } from '../domain/dates';
import type { AppRoute } from '../navigation/router';
import { useTripStore } from '../state/TripContext';

interface TripSettingsScreenProps {
  route: AppRoute;
  tripId: string;
  navigate: (route: AppRoute) => void;
}

export const TripSettingsScreen: React.FC<TripSettingsScreenProps> = ({
  route,
  tripId,
  navigate,
}) => {
  const { db, renameTrip, setTripStatus, deleteTrip, showToast } = useTripStore();
  const trip = db.trips.find((t) => t.id === tripId);

  const [nameInput, setNameInput] = useState(trip?.name ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  if (!trip) {
    return (
      <AppShell
        route={route}
        navigate={navigate}
        title="Trip Settings"
        backRoute={{ screen: 'home' }}
      >
        <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">Trip not found.</p>
        </div>
      </AppShell>
    );
  }

  const memberCount = db.members.filter((m) => m.tripId === trip.id).length;
  const expenseCount = db.expenses.filter((e) => e.tripId === trip.id).length;

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    const result = renameTrip(trip.id, nameInput);
    if (!result.ok) {
      setNameError(result.error);
      return;
    }
    setNameInput(result.value.name);
    showToast(`Trip renamed to "${result.value.name}".`);
  };

  const handleToggleStatus = () => {
    const nextStatus = trip.status === 'active' ? 'settled' : 'active';
    const result = setTripStatus(trip.id, nextStatus);
    if (!result.ok) {
      showToast(result.error, 'error');
      return;
    }
    showToast(
      nextStatus === 'settled'
        ? `"${trip.name}" marked as settled.`
        : `"${trip.name}" reopened as active.`
    );
  };

  const handleExportTripJson = () => {
    const tripExpenses = db.expenses.filter((e) => e.tripId === trip.id);
    const expenseIds = new Set(tripExpenses.map((e) => e.id));
    const exportPayload = {
      trips: [trip],
      members: db.members.filter((m) => m.tripId === trip.id),
      expenses: tripExpenses,
      expenseShares: db.expenseShares.filter((s) => expenseIds.has(s.expenseId)),
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeSlug = trip.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `${safeSlug || 'trip'}-expenses.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Trip JSON backup downloaded.');
  };

  const handleConfirmDeleteTrip = () => {
    const tripName = trip.name;
    const result = deleteTrip(trip.id);
    setDeleteModalOpen(false);
    if (!result.ok) {
      showToast(result.error, 'error');
      return;
    }
    showToast(`Deleted "${tripName}" and all its records.`);
    navigate({ screen: 'home' });
  };

  return (
    <AppShell
      route={route}
      navigate={navigate}
      title="Trip Settings"
      backRoute={{ screen: 'trip-details', tripId: trip.id }}
      activeTripId={trip.id}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Rename Trip */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-6">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Rename Trip
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Created on {formatCreatedDate(trip.createdAt)} · {memberCount}{' '}
            {memberCount === 1 ? 'member' : 'members'} · {expenseCount}{' '}
            {expenseCount === 1 ? 'expense' : 'expenses'}
          </p>

          <form onSubmit={handleRenameSubmit} noValidate className="mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (nameError) setNameError(null);
                }}
                aria-label="Trip name"
                maxLength={80}
                className="flex-1 min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              />
              <button
                type="submit"
                className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173473] dark:hover:bg-[#4F46E5] transition-colors whitespace-nowrap shrink-0"
              >
                <Save className="h-4 w-4" />
                <span>Save Name</span>
              </button>
            </div>
            {nameError && (
              <p
                role="alert"
                className="text-sm font-medium text-red-600 dark:text-red-400"
              >
                {nameError}
              </p>
            )}
          </form>
        </section>

        {/* Trip Status */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Trip Status
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {trip.status === 'settled'
                ? 'This trip is currently marked as settled. Reopen it anytime if more expenses need to be adjusted.'
                : 'Mark this trip as settled once all suggested payments between friends have been completed.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggleStatus}
            className={`min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
              trip.status === 'settled'
                ? 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            {trip.status === 'settled' ? (
              <>
                <RotateCcw className="h-4 w-4" />
                <span>Reopen Trip</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Mark as Settled</span>
              </>
            )}
          </button>
        </section>

        {/* Local Data Export */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Export Trip Data (JSON)
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Download a local JSON copy of this trip’s members, expenses, and share allocations.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportTripJson}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-[#0F2557] dark:text-indigo-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="h-4 w-4" />
            <span>Export JSON</span>
          </button>
        </section>

        {/* Danger Zone: Delete Trip */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-red-200/80 dark:border-red-900/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-red-700 dark:text-red-400">
              Delete Trip
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Permanently deletes this trip along with all {memberCount}{' '}
              {memberCount === 1 ? 'member' : 'members'} and {expenseCount}{' '}
              {expenseCount === 1 ? 'expense' : 'expenses'}. This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete Trip</span>
          </button>
        </section>
      </div>

      <ConfirmDialog
        open={deleteModalOpen}
        title={`Delete "${trip.name}"?`}
        description={`This will permanently delete "${trip.name}" and cascade delete all ${memberCount} ${
          memberCount === 1 ? 'member' : 'members'
        }, ${expenseCount} ${
          expenseCount === 1 ? 'expense' : 'expenses'
        }, and all associated expense shares. Other trips will not be affected.`}
        confirmLabel="Delete Permanently"
        destructive
        onConfirm={handleConfirmDeleteTrip}
        onCancel={() => setDeleteModalOpen(false)}
      />
    </AppShell>
  );
};
