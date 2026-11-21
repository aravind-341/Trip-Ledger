import React, { useState } from 'react';
import { Plus, Trash2, UserPlus } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Avatar } from '../components/Avatar';
import { normalizeName } from '../domain/validation';
import type { AppRoute } from '../navigation/router';
import { useTripStore } from '../state/TripContext';

interface CreateTripScreenProps {
  route: AppRoute;
  navigate: (route: AppRoute) => void;
}

export const CreateTripScreen: React.FC<CreateTripScreenProps> = ({
  route,
  navigate,
}) => {
  const { createTrip, showToast } = useTripStore();
  const [tripName, setTripName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [pendingMembers, setPendingMembers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);

  const handleAddPendingMember = () => {
    const cleaned = normalizeName(memberInput);
    if (!cleaned) {
      setMemberError('Enter a friend’s name to add them.');
      return;
    }
    const exists = pendingMembers.some(
      (m) => m.toLowerCase() === cleaned.toLowerCase()
    );
    if (exists) {
      setMemberError(`"${cleaned}" is already added to this trip.`);
      return;
    }
    setPendingMembers((prev) => [...prev, cleaned]);
    setMemberInput('');
    setMemberError(null);
  };

  const handleRemovePendingMember = (name: string) => {
    setPendingMembers((prev) => prev.filter((m) => m !== name));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If user typed a member name into the input without pressing Add, include it cleanly
    const finalMembers = [...pendingMembers];
    const leftover = normalizeName(memberInput);
    if (leftover) {
      const exists = finalMembers.some(
        (m) => m.toLowerCase() === leftover.toLowerCase()
      );
      if (exists) {
        setMemberError(`"${leftover}" is already added to this trip.`);
        return;
      }
      finalMembers.push(leftover);
    }

    const result = createTrip(tripName, finalMembers);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    showToast(`Trip "${result.value.name}" created.`);
    navigate({ screen: 'trip-details', tripId: result.value.id });
  };

  return (
    <AppShell
      route={route}
      navigate={navigate}
      title="Create New Trip"
      backRoute={{ screen: 'home' }}
    >
      <div className="max-w-2xl mx-auto">
        <form
          onSubmit={handleSubmit}
          noValidate
          className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 space-y-6"
        >
          <div>
            <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
              Trip details
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Give your trip a clear name. You can add friends right now or later inside the trip.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="trip-name-input"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Trip name <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="trip-name-input"
              type="text"
              value={tripName}
              onChange={(e) => {
                setTripName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g., Goa Beach Weekend, Manali Road Trip"
              autoFocus
              maxLength={80}
              className="mt-2 w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
            />
          </div>

          {/* Optional Initial Friends */}
          <div className="pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
            <div>
              <label
                htmlFor="initial-member-input"
                className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
              >
                Add friends (optional)
              </label>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                No phone numbers or accounts needed — just names.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                id="initial-member-input"
                type="text"
                value={memberInput}
                onChange={(e) => {
                  setMemberInput(e.target.value);
                  if (memberError) setMemberError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPendingMember();
                  }
                }}
                placeholder="Enter friend's name"
                maxLength={60}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              />
              <button
                type="button"
                onClick={handleAddPendingMember}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-[#0F2557] dark:text-indigo-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add</span>
              </button>
            </div>

            {memberError && (
              <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                {memberError}
              </p>
            )}

            {pendingMembers.length > 0 && (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800/80 border-t border-slate-100 dark:border-slate-800/80 pt-1">
                {pendingMembers.map((name) => (
                  <li
                    key={name}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={name} size="sm" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePendingMember(name)}
                      aria-label={`Remove ${name}`}
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
            <button
              type="button"
              onClick={() => navigate({ screen: 'home' })}
              className="min-h-[46px] px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[46px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] text-sm font-semibold text-white hover:bg-[#173473] dark:hover:bg-[#4F46E5] transition-colors whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              <span>Create Trip</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
};
