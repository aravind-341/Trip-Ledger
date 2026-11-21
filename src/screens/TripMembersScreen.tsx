import React, { useMemo, useState } from 'react';
import { ChevronRight, Lock, Trash2, UserPlus, Users } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { isMemberUsedInTripExpenses } from '../domain/validation';
import type { AppRoute } from '../navigation/router';
import { useTripStore } from '../state/TripContext';
import type { Member } from '../types/models';

interface TripMembersScreenProps {
  route: AppRoute;
  tripId: string;
  navigate: (route: AppRoute) => void;
}

export const TripMembersScreen: React.FC<TripMembersScreenProps> = ({
  route,
  tripId,
  navigate,
}) => {
  const { db, addMember, removeMember, showToast } = useTripStore();
  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  const trip = db.trips.find((t) => t.id === tripId);
  const tripMembers = useMemo(
    () => db.members.filter((m) => m.tripId === tripId),
    [db.members, tripId]
  );

  const memberExpenseCounts = useMemo(() => {
    const map = new Map<string, number>();
    const tripExpenses = db.expenses.filter((e) => e.tripId === tripId);
    for (const member of tripMembers) {
      const involvedExpenseIds = new Set<string>();
      for (const exp of tripExpenses) {
        if (exp.payerMemberId === member.id) {
          involvedExpenseIds.add(exp.id);
        }
      }
      for (const share of db.expenseShares) {
        if (share.memberId === member.id) {
          involvedExpenseIds.add(share.expenseId);
        }
      }
      map.set(member.id, involvedExpenseIds.size);
    }
    return map;
  }, [db.expenses, db.expenseShares, tripId, tripMembers]);

  if (!trip) {
    return (
      <AppShell
        route={route}
        navigate={navigate}
        title="Members"
        backRoute={{ screen: 'home' }}
      >
        <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200 dark:border-slate-800 p-8 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">Trip not found.</p>
        </div>
      </AppShell>
    );
  }

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const result = addMember(trip.id, nameInput);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNameInput('');
    showToast(`${result.value.name} added to ${trip.name}.`);
  };

  const handleConfirmDelete = () => {
    if (!memberToDelete) return;
    const result = removeMember(memberToDelete.id);
    if (!result.ok) {
      showToast(result.error, 'error');
    } else {
      showToast(`${memberToDelete.name} removed from trip.`);
    }
    setMemberToDelete(null);
  };

  return (
    <AppShell
      route={route}
      navigate={navigate}
      title="Trip Members"
      backRoute={{ screen: 'trip-details', tripId: trip.id }}
      activeTripId={trip.id}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Add Friend Form */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6">
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Add a friend to {trip.name}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Member names must be unique within this trip. No account or contact info is required.
          </p>

          <form onSubmit={handleAddMember} noValidate className="mt-4">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Friend's name (e.g., Aravind)"
                aria-label="Friend's name"
                maxLength={60}
                className="flex-1 min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              />
              <button
                type="submit"
                className="min-h-[46px] inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173473] dark:hover:bg-[#4F46E5] transition-colors whitespace-nowrap shrink-0"
              >
                <UserPlus className="h-4 w-4" />
                <span>Add Member</span>
              </button>
            </div>
            {error && (
              <p
                role="alert"
                className="mt-2.5 text-sm font-medium text-red-600 dark:text-red-400"
              >
                {error}
              </p>
            )}
          </form>
        </section>

        {/* Member List */}
        <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-white">
                Members ({tripMembers.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Click any member to inspect their person-wise expense ledger.
              </p>
            </div>
          </div>

          {tripMembers.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="mx-auto h-9 w-9 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">
                No members yet
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Add everyone joining this trip above so you can record and split expenses.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {tripMembers.map((member) => {
                const isUsed = isMemberUsedInTripExpenses(db, member.id);
                const count = memberExpenseCounts.get(member.id) ?? 0;

                return (
                  <li
                    key={member.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          screen: 'member-expenses',
                          tripId: trip.id,
                          memberId: member.id,
                        })
                      }
                      className="flex-1 min-w-0 flex items-center gap-3.5 text-left group py-1"
                    >
                      <Avatar name={member.name} size="md" />
                      <div className="min-w-0">
                        <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white group-hover:text-[#4338CA] dark:group-hover:text-indigo-300 truncate transition-colors">
                          {member.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {count === 0
                            ? 'No expenses recorded yet'
                            : `Included in ${count} ${
                                count === 1 ? 'expense' : 'expenses'
                              }`}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isUsed ? (
                        <button
                          type="button"
                          onClick={() =>
                            showToast(
                              `${member.name} is used in ${count} ${
                                count === 1 ? 'expense' : 'expenses'
                              } and cannot be removed.`,
                              'error'
                            )
                          }
                          title="Used in expenses — cannot be removed"
                          aria-label={`${member.name} cannot be removed because they are used in expenses`}
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Lock className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setMemberToDelete(member)}
                          aria-label={`Remove ${member.name}`}
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          navigate({
                            screen: 'member-expenses',
                            tripId: trip.id,
                            memberId: member.id,
                          })
                        }
                        aria-label={`View ${member.name}'s expenses`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={!!memberToDelete}
        title={`Remove ${memberToDelete?.name ?? 'member'}?`}
        description="This member has no recorded expenses and will be removed from this trip."
        confirmLabel="Remove Member"
        destructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setMemberToDelete(null)}
      />
    </AppShell>
  );
};
