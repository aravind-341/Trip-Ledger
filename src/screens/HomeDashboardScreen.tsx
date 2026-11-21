import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Compass,
  Plus,
  Search,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { formatINR } from '../domain/currency';
import { formatCreatedDate } from '../domain/dates';
import { getTripTotalCents } from '../domain/settlement';
import type { AppRoute } from '../navigation/router';
import { useTripStore } from '../state/TripContext';
import type { TripStatus } from '../types/models';

interface HomeDashboardScreenProps {
  route: AppRoute;
  navigate: (route: AppRoute) => void;
}

export const HomeDashboardScreen: React.FC<HomeDashboardScreenProps> = ({
  route,
  navigate,
}) => {
  const { db } = useTripStore();
  const [statusFilter, setStatusFilter] = useState<'all' | TripStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const summary = useMemo(() => {
    const totalTrips = db.trips.length;
    const activeTrips = db.trips.filter((t) => t.status === 'active').length;
    const totalExpensesCount = db.expenses.length;
    const totalExpenditureCents = db.expenses.reduce(
      (sum, e) => sum + e.amountCents,
      0
    );
    return {
      totalTrips,
      activeTrips,
      totalExpensesCount,
      totalExpenditureCents,
    };
  }, [db]);

  const filteredTrips = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return [...db.trips]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter((trip) => {
        if (statusFilter !== 'all' && trip.status !== statusFilter) return false;
        if (query && !trip.name.toLowerCase().includes(query)) return false;
        return true;
      });
  }, [db.trips, statusFilter, searchQuery]);

  const headerAction = (
    <button
      type="button"
      onClick={() => navigate({ screen: 'create-trip' })}
      className="min-h-[40px] inline-flex items-center gap-1.5 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#173473] dark:hover:bg-[#4F46E5] transition-colors whitespace-nowrap shrink-0"
    >
      <Plus className="h-4 w-4 shrink-0" />
      <span>New Trip</span>
    </button>
  );

  return (
    <AppShell
      route={route}
      navigate={navigate}
      title="Trip Expense Tracker"
      headerAction={headerAction}
    >
      <div className="space-y-6">
        {/* Welcome & Financial Summary Hero Card */}
        <section className="rounded-2xl bg-[#0F2557] dark:bg-[#131C31] dark:border dark:border-slate-800 text-white p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-sm font-medium text-indigo-200 dark:text-indigo-300">
                Organizer Workspace
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
                Keep every group trip balanced to the last rupee.
              </h2>
              <p className="mt-2 text-sm text-slate-200/90 dark:text-slate-300 leading-relaxed">
                Record shared expenses, assign custom amounts per friend, and calculate exact settlements offline on your device.
              </p>
            </div>
            <div className="shrink-0">
              <button
                type="button"
                onClick={() => navigate({ screen: 'create-trip' })}
                className="w-full sm:w-auto min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-white text-[#0F2557] hover:bg-slate-100 dark:bg-[#4338CA] dark:text-white dark:hover:bg-[#4F46E5] px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span>Create New Trip</span>
              </button>
            </div>
          </div>

          <div className="mt-7 pt-6 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <p className="text-xs font-medium text-indigo-200/90 dark:text-slate-400">
                Total Trips
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums-ledger text-white">
                {summary.totalTrips}
              </p>
              <p className="mt-0.5 text-xs text-slate-300/80 dark:text-slate-400">
                {summary.activeTrips} active
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-200/90 dark:text-slate-400">
                Recorded Expenses
              </p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums-ledger text-white">
                {summary.totalExpensesCount}
              </p>
              <p className="mt-0.5 text-xs text-slate-300/80 dark:text-slate-400">
                Across all trips
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-indigo-200/90 dark:text-slate-400">
                Total Tracked Spend
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums-ledger text-white">
                {formatINR(summary.totalExpenditureCents)}
              </p>
              <p className="mt-0.5 text-xs text-slate-300/80 dark:text-slate-400">
                Stored locally in INR
              </p>
            </div>
          </div>
        </section>

        {/* Trips Section */}
        {db.trips.length === 0 ? (
          <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0F2557]/8 dark:bg-indigo-500/15 text-[#0F2557] dark:text-indigo-300">
              <Compass className="h-7 w-7" />
            </div>
            <h3 className="mt-5 font-display text-xl font-bold text-slate-900 dark:text-white">
              No trips recorded yet
            </h3>
            <p className="mt-2 max-w-md mx-auto text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Start by creating your first trip, adding your friends, and logging group expenses with custom individual shares.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => navigate({ screen: 'create-trip' })}
                className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#173473] dark:hover:bg-[#4F46E5] transition-colors whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>Create Your First Trip</span>
              </button>
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">
                  Recent Trips
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select a trip to manage members, log expenses, or view settlements.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {/* Search input */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search trips..."
                    aria-label="Search trips"
                    className="w-full sm:w-52 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#131C31] pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
                  />
                </div>

                {/* Interactive Segmented Filter Control */}
                <div
                  role="tablist"
                  aria-label="Filter trips by status"
                  className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/90"
                >
                  {(['all', 'active', 'settled'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      role="tab"
                      aria-selected={statusFilter === status}
                      onClick={() => setStatusFilter(status)}
                      className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors whitespace-nowrap ${
                        statusFilter === status
                          ? 'bg-white dark:bg-[#131C31] text-[#0F2557] dark:text-white shadow-xs font-semibold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {filteredTrips.length === 0 ? (
              <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-8 text-center">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  No trips match your current filter.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="mt-3 text-sm font-semibold text-[#4338CA] dark:text-indigo-400 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTrips.map((trip) => {
                  const memberCount = db.members.filter(
                    (m) => m.tripId === trip.id
                  ).length;
                  const expenseCount = db.expenses.filter(
                    (e) => e.tripId === trip.id
                  ).length;
                  const totalCents = getTripTotalCents(db, trip.id);

                  return (
                    <button
                      key={trip.id}
                      type="button"
                      onClick={() =>
                        navigate({ screen: 'trip-details', tripId: trip.id })
                      }
                      className="group text-left w-full rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-5 hover:border-[#4338CA]/50 dark:hover:border-indigo-500/50 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-[#0F2557] dark:group-hover:text-indigo-300 truncate transition-colors">
                            {trip.name}
                          </h4>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                            <span>
                              {memberCount}{' '}
                              {memberCount === 1 ? 'member' : 'members'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {expenseCount}{' '}
                              {expenseCount === 1 ? 'expense' : 'expenses'}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Created {formatCreatedDate(trip.createdAt)}</span>
                          </div>
                        </div>

                        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#4338CA] dark:group-hover:text-indigo-400 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" />
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Total expenditure
                          </p>
                          <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums-ledger text-[#0F2557] dark:text-white">
                            {formatINR(totalCents)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          {trip.status === 'settled' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Settled
                            </span>
                          ) : (
                            <span className="text-[#4338CA] dark:text-indigo-300">
                              Active Trip
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </AppShell>
  );
};
