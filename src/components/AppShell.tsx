import React from 'react';
import {
  ArrowLeft,
  Calculator,
  Compass,
  Home,
  Moon,
  Plus,
  Receipt,
  Settings,
  Sun,
  Users,
  X,
} from 'lucide-react';
import type { AppRoute } from '../navigation/router';
import { useTripStore } from '../state/TripContext';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallButton';

interface AppShellProps {
  route: AppRoute;
  navigate: (route: AppRoute) => void;
  title: string;
  backRoute?: AppRoute;
  headerAction?: React.ReactNode;
  activeTripId?: string;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  route,
  navigate,
  title,
  backRoute,
  headerAction,
  activeTripId,
  children,
}) => {
  const { db, theme, toggleTheme, toast, dismissToast, storageError } = useTripStore();
  const activeTrip = activeTripId
    ? db.trips.find((t) => t.id === activeTripId)
    : undefined;

  const isTripTabActive = (tab: 'trip-details' | 'trip-members' | 'settlement' | 'trip-settings') => {
    if (route.screen === tab) return true;
    if (
      tab === 'trip-details' &&
      (route.screen === 'add-expense' ||
        route.screen === 'expense-details' ||
        route.screen === 'edit-expense')
    ) {
      return true;
    }
    if (tab === 'trip-members' && route.screen === 'member-expenses') {
      return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F1F5F9] flex">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 bg-white dark:bg-[#10182B] border-r border-slate-200/80 dark:border-slate-800 z-30">
        <div className="h-16 px-6 flex items-center border-b border-slate-100 dark:border-slate-800/80">
          <button
            type="button"
            onClick={() => navigate({ screen: 'home' })}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338CA] rounded-lg"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F2557] dark:bg-[#4338CA] text-white font-display font-bold text-base shrink-0">
              ₹
            </div>
            <span className="font-display text-base font-bold tracking-tight text-[#0F2557] dark:text-white whitespace-nowrap">
              Trip Expense Tracker
            </span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => navigate({ screen: 'home' })}
              className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                route.screen === 'home'
                  ? 'bg-[#0F2557]/8 dark:bg-indigo-500/15 text-[#0F2557] dark:text-indigo-200 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Home className="h-4 w-4 shrink-0" />
              <span className="truncate">Dashboard</span>
            </button>
            <button
              type="button"
              onClick={() => navigate({ screen: 'create-trip' })}
              className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                route.screen === 'create-trip'
                  ? 'bg-[#0F2557]/8 dark:bg-indigo-500/15 text-[#0F2557] dark:text-indigo-200 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="truncate">Create New Trip</span>
            </button>
          </div>

          {activeTrip && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
              <p className="px-3 pb-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 truncate">
                {activeTrip.name}
              </p>
              <button
                type="button"
                onClick={() =>
                  navigate({ screen: 'trip-details', tripId: activeTrip.id })
                }
                className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isTripTabActive('trip-details')
                    ? 'bg-[#0F2557]/8 dark:bg-indigo-500/15 text-[#0F2557] dark:text-indigo-200 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Receipt className="h-4 w-4 shrink-0" />
                <span className="truncate">Expenses & Overview</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate({ screen: 'trip-members', tripId: activeTrip.id })
                }
                className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isTripTabActive('trip-members')
                    ? 'bg-[#0F2557]/8 dark:bg-indigo-500/15 text-[#0F2557] dark:text-indigo-200 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span className="truncate">Members</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate({ screen: 'settlement', tripId: activeTrip.id })
                }
                className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isTripTabActive('settlement')
                    ? 'bg-[#0F2557]/8 dark:bg-indigo-500/15 text-[#0F2557] dark:text-indigo-200 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Calculator className="h-4 w-4 shrink-0" />
                <span className="truncate">Settlement</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate({ screen: 'trip-settings', tripId: activeTrip.id })
                }
                className={`w-full min-h-[42px] flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isTripTabActive('trip-settings')
                    ? 'bg-[#0F2557]/8 dark:bg-indigo-500/15 text-[#0F2557] dark:text-indigo-200 font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span className="truncate">Trip Settings</span>
              </button>
            </div>
          )}

          {db.trips.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
              <p className="px-3 pb-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                Your Trips
              </p>
              {db.trips.slice(0, 8).map((trip) => {
                const isSelected = activeTripId === trip.id;
                return (
                  <button
                    key={trip.id}
                    type="button"
                    onClick={() =>
                      navigate({ screen: 'trip-details', tripId: trip.id })
                    }
                    className={`w-full min-h-[38px] flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isSelected
                        ? 'text-[#0F2557] dark:text-indigo-300 font-semibold bg-slate-100/80 dark:bg-slate-800/70'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <Compass className="h-3.5 w-3.5 shrink-0 opacity-70" />
                      <span className="truncate">{trip.name}</span>
                    </span>
                    {trip.status === 'settled' && (
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 shrink-0">
                        Settled
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
          <PWAInstallButton />
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full min-h-[42px] flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="flex items-center gap-2.5">
              {theme === 'light' ? (
                <Moon className="h-4 w-4 text-slate-500" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
              <span>{theme === 'light' ? 'Dark appearance' : 'Light appearance'}</span>
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Sticky Top App Bar */}
        <header className="sticky top-0 z-20 h-14 lg:h-16 bg-white/90 dark:bg-[#10182B]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
          <div className="max-w-6xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {backRoute ? (
                <button
                  type="button"
                  onClick={() => navigate(backRoute)}
                  aria-label="Go back"
                  className="flex h-10 w-10 -ml-2 shrink-0 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              ) : (
                <div className="flex lg:hidden h-8 w-8 items-center justify-center rounded-lg bg-[#0F2557] dark:bg-[#4338CA] text-white font-display font-bold text-sm shrink-0">
                  ₹
                </div>
              )}
              <h1 className="font-display text-base sm:text-lg font-bold tracking-tight text-[#0F2557] dark:text-white truncate">
                {title}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="lg:hidden">
                <PWAInstallButton compact />
              </div>
              {headerAction}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={
                  theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
                }
                className="flex lg:hidden h-10 w-10 items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                {theme === 'light' ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-400" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Storage Error Notice if any */}
        {storageError && (
          <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
            <div
              role="alert"
              className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300"
            >
              {storageError}
            </div>
          </div>
        )}

        {/* Main Scrollable Viewport */}
        <main
          className={`flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 ${
            activeTrip ? 'pb-24 lg:pb-10' : 'pb-10'
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (Inside Trip Context) */}
      {activeTrip && (
        <nav
          aria-label="Trip navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#10182B]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 pb-safe"
        >
          <div className="grid grid-cols-4 h-16 max-w-lg mx-auto">
            <button
              type="button"
              onClick={() =>
                navigate({ screen: 'trip-details', tripId: activeTrip.id })
              }
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                isTripTabActive('trip-details')
                  ? 'text-[#0F2557] dark:text-indigo-300 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Receipt className="h-5 w-5" />
              <span>Expenses</span>
            </button>
            <button
              type="button"
              onClick={() =>
                navigate({ screen: 'trip-members', tripId: activeTrip.id })
              }
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                isTripTabActive('trip-members')
                  ? 'text-[#0F2557] dark:text-indigo-300 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Users className="h-5 w-5" />
              <span>Members</span>
            </button>
            <button
              type="button"
              onClick={() =>
                navigate({ screen: 'settlement', tripId: activeTrip.id })
              }
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                isTripTabActive('settlement')
                  ? 'text-[#0F2557] dark:text-indigo-300 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Calculator className="h-5 w-5" />
              <span>Settle</span>
            </button>
            <button
              type="button"
              onClick={() =>
                navigate({ screen: 'trip-settings', tripId: activeTrip.id })
              }
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                isTripTabActive('trip-settings')
                  ? 'text-[#0F2557] dark:text-indigo-300 font-semibold'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </div>
        </nav>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 z-50 max-w-sm rounded-xl px-4 py-3 shadow-lg border flex items-center gap-3 transition-all ${
            activeTrip ? 'bottom-20 lg:bottom-6' : 'bottom-6'
          } ${
            toast.tone === 'error'
              ? 'bg-red-600 text-white border-red-500'
              : 'bg-[#0F2557] dark:bg-slate-800 text-white border-slate-700/60'
          }`}
        >
          <span className="text-sm font-medium">{toast.text}</span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="text-white/70 hover:text-white shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <OfflineIndicator />
    </div>
  );
};
