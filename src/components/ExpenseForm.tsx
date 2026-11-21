import React, { useMemo, useState } from 'react';
import { Check, Divide, Save, UserPlus } from 'lucide-react';
import {
  centsToInputString,
  formatINR,
  parseRupeesToCents,
  splitCentsEqually,
} from '../domain/currency';
import { getTodayIsoDate } from '../domain/dates';
import type { Expense, ExpenseInput, ExpenseShare, Member } from '../types/models';
import { Avatar } from './Avatar';

interface ExpenseFormProps {
  tripId: string;
  members: Member[];
  existingExpense?: Expense;
  existingShares?: ExpenseShare[];
  submitLabel: string;
  onSubmit: (input: ExpenseInput) => string | null;
  onCancel: () => void;
  onAddMembersClick: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  tripId,
  members,
  existingExpense,
  existingShares = [],
  submitLabel,
  onSubmit,
  onCancel,
  onAddMembersClick,
}) => {
  const [expenseDate, setExpenseDate] = useState<string>(
    existingExpense?.expenseDate ?? getTodayIsoDate()
  );
  const [description, setDescription] = useState<string>(
    existingExpense?.description ?? ''
  );
  const [totalAmountInput, setTotalAmountInput] = useState<string>(
    existingExpense ? centsToInputString(existingExpense.amountCents) : ''
  );
  const [payerMemberId, setPayerMemberId] = useState<string>(
    existingExpense?.payerMemberId ?? members[0]?.id ?? ''
  );

  // Selected sharing members and their manual share inputs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (existingExpense) {
      return new Set(existingShares.map((s) => s.memberId));
    }
    return new Set<string>();
  });

  const [shareInputs, setShareInputs] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const share of existingShares) {
      initial[share.memberId] = centsToInputString(share.amountCents);
    }
    return initial;
  });

  const [error, setError] = useState<string | null>(null);

  const parsedTotalCents = useMemo(
    () => parseRupeesToCents(totalAmountInput),
    [totalAmountInput]
  );

  const selectedMembers = useMemo(
    () => members.filter((m) => selectedIds.has(m.id)),
    [members, selectedIds]
  );

  const shareSummary = useMemo(() => {
    let sumCents = 0;
    let hasInvalidOrEmptyShare = false;

    for (const member of selectedMembers) {
      const raw = shareInputs[member.id] ?? '';
      const cents = parseRupeesToCents(raw);
      if (cents === null || cents <= 0) {
        hasInvalidOrEmptyShare = true;
      } else {
        sumCents += cents;
      }
    }

    const diffCents =
      parsedTotalCents !== null ? parsedTotalCents - sumCents : null;
    const isBalanced =
      parsedTotalCents !== null &&
      parsedTotalCents > 0 &&
      selectedMembers.length > 0 &&
      !hasInvalidOrEmptyShare &&
      diffCents === 0;

    return {
      sumCents,
      diffCents,
      hasInvalidOrEmptyShare,
      isBalanced,
    };
  }, [parsedTotalCents, selectedMembers, shareInputs]);

  if (members.length === 0) {
    return (
      <div className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-8 text-center">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Add trip members first
        </h2>
        <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          You need at least one friend in this trip to record who paid and who shares an expense.
        </p>
        <button
          type="button"
          onClick={onAddMembersClick}
          className="mt-5 min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#173473]"
        >
          <UserPlus className="h-4 w-4" />
          <span>Go to Members</span>
        </button>
      </div>
    );
  }

  const toggleMember = (memberId: string) => {
    setError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const selectAllMembers = () => {
    setError(null);
    setSelectedIds(new Set(members.map((m) => m.id)));
  };

  const clearSelectedMembers = () => {
    setError(null);
    setSelectedIds(new Set());
  };

  const handleEqualSplitClick = () => {
    setError(null);
    if (parsedTotalCents === null || parsedTotalCents <= 0) {
      setError('Enter a valid total expense amount before splitting equally.');
      return;
    }
    if (selectedMembers.length === 0) {
      setError('Select at least one member to split the expense.');
      return;
    }
    const equalShares = splitCentsEqually(parsedTotalCents, selectedMembers.length);
    setShareInputs((prev) => {
      const next = { ...prev };
      selectedMembers.forEach((m, index) => {
        next[m.id] = centsToInputString(equalShares[index]);
      });
      return next;
    });
  };

  const handleFillRemaining = (memberId: string) => {
    if (parsedTotalCents === null || parsedTotalCents <= 0) return;
    let otherSum = 0;
    for (const member of selectedMembers) {
      if (member.id === memberId) continue;
      const cents = parseRupeesToCents(shareInputs[member.id] ?? '');
      if (cents !== null && cents > 0) {
        otherSum += cents;
      }
    }
    const remaining = parsedTotalCents - otherSum;
    if (remaining > 0) {
      setShareInputs((prev) => ({
        ...prev,
        [memberId]: centsToInputString(remaining),
      }));
      setError(null);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!description.trim()) {
      setError('Expense description is required.');
      return;
    }

    if (parsedTotalCents === null || parsedTotalCents <= 0) {
      setError('Enter a valid positive total expense amount in ₹.');
      return;
    }

    if (!payerMemberId) {
      setError('Select who paid for this expense.');
      return;
    }

    if (selectedMembers.length === 0) {
      setError('Select at least one member who shares this expense.');
      return;
    }

    const shares: { memberId: string; amountCents: number }[] = [];
    let runningTotal = 0;

    for (const member of selectedMembers) {
      const raw = shareInputs[member.id] ?? '';
      const cents = parseRupeesToCents(raw);
      if (cents === null || cents <= 0) {
        setError(
          `Enter a valid positive share amount for ${member.name}, or uncheck them if their share is ₹0.`
        );
        return;
      }
      shares.push({ memberId: member.id, amountCents: cents });
      runningTotal += cents;
    }

    if (runningTotal !== parsedTotalCents) {
      const diff = parsedTotalCents - runningTotal;
      if (diff > 0) {
        setError(
          `Individual shares total ${formatINR(runningTotal)}, which is ${formatINR(
            diff
          )} less than the total expense of ${formatINR(parsedTotalCents)}.`
        );
      } else {
        setError(
          `Individual shares total ${formatINR(runningTotal)}, which exceeds the total expense of ${formatINR(
            parsedTotalCents
          )} by ${formatINR(Math.abs(diff))}.`
        );
      }
      return;
    }

    const validationError = onSubmit({
      tripId,
      payerMemberId,
      expenseDate,
      description,
      amountCents: parsedTotalCents,
      shares,
    });

    if (validationError) {
      setError(validationError);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} noValidate className="space-y-6">
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {/* Core Expense Details Card */}
      <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            Expense Details
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Enter what was spent, when it occurred, and who paid the bill.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label
              htmlFor="expense-description"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Description <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="expense-description"
              type="text"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g., Dinner at Beach Shack, Hotel Booking, Petrol"
              maxLength={140}
              className="mt-1.5 w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
            />
          </div>

          <div>
            <label
              htmlFor="expense-amount"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Total Amount (₹){' '}
              <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <div className="relative mt-1.5">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm font-semibold text-slate-500 dark:text-slate-400">
                ₹
              </span>
              <input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                value={totalAmountInput}
                onChange={(e) => {
                  setTotalAmountInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="0.00"
                className="w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-4 py-2.5 font-mono text-base font-semibold tabular-nums-ledger text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="expense-date"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Expense Date <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="expense-date"
              type="date"
              value={expenseDate}
              onChange={(e) => {
                setExpenseDate(e.target.value);
                if (error) setError(null);
              }}
              className="mt-1.5 w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="expense-payer"
              className="block text-sm font-semibold text-slate-800 dark:text-slate-200"
            >
              Paid By <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <select
              id="expense-payer"
              value={payerMemberId}
              onChange={(e) => {
                setPayerMemberId(e.target.value);
                if (error) setError(null);
              }}
              className="mt-1.5 w-full min-h-[46px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
            >
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              The person who paid can be different from the friends sharing the expense below.
            </p>
          </div>
        </div>
      </section>

      {/* Custom Expense Sharing Section */}
      <section className="rounded-2xl bg-white dark:bg-[#131C31] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 sm:px-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Custom Expense Sharing
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select only the friends who shared this expense and enter each person’s exact share. Unchecked friends have ₹0 share.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={selectAllMembers}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={clearSelectedMembers}
              className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleEqualSplitClick}
              disabled={selectedMembers.length === 0 || !parsedTotalCents}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-xs font-semibold text-[#4338CA] dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              <Divide className="h-3.5 w-3.5" />
              <span>Split selected equally</span>
            </button>
          </div>
        </div>

        {/* Member Share Rows */}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {members.map((member) => {
            const isSelected = selectedIds.has(member.id);
            const shareVal = shareInputs[member.id] ?? '';

            return (
              <li
                key={member.id}
                className={`px-5 py-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isSelected
                    ? 'bg-indigo-50/35 dark:bg-indigo-950/20'
                    : 'bg-transparent'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleMember(member.id)}
                  aria-pressed={isSelected}
                  className="flex items-center gap-3.5 min-h-[44px] text-left flex-1 min-w-0"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      isSelected
                        ? 'bg-[#0F2557] border-[#0F2557] dark:bg-[#4338CA] dark:border-[#4338CA] text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </span>
                  <Avatar name={member.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {member.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isSelected ? 'Included in this expense' : 'Not sharing (₹0)'}
                    </p>
                  </div>
                </button>

                {isSelected ? (
                  <div className="flex items-center gap-2 pl-9 sm:pl-0 shrink-0">
                    <div className="relative w-36 sm:w-40">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                        ₹
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Share amount for ${member.name}`}
                        value={shareVal}
                        onChange={(e) => {
                          setShareInputs((prev) => ({
                            ...prev,
                            [member.id]: e.target.value,
                          }));
                          if (error) setError(null);
                        }}
                        placeholder="0.00"
                        className="w-full min-h-[42px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-7 pr-3 py-2 font-mono text-sm font-semibold tabular-nums-ledger text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4338CA]"
                      />
                    </div>
                    {parsedTotalCents !== null &&
                      parsedTotalCents > 0 &&
                      shareSummary.diffCents !== null &&
                      shareSummary.diffCents > 0 && (
                        <button
                          type="button"
                          onClick={() => handleFillRemaining(member.id)}
                          title="Assign remaining unallocated amount to this member"
                          className="min-h-[42px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-[#4338CA] dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors whitespace-nowrap"
                        >
                          Fill rest
                        </button>
                      )}
                  </div>
                ) : (
                  <span className="pl-9 sm:pl-0 font-mono text-sm text-slate-400 dark:text-slate-500 tabular-nums-ledger shrink-0">
                    ₹0
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        {/* Live Share Validation Footer */}
        <div className="px-5 py-4 sm:px-6 bg-slate-50/90 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs sm:text-sm">
            <div>
              <span className="text-slate-500 dark:text-slate-400">Assigned: </span>
              <span className="font-mono font-semibold tabular-nums-ledger text-slate-900 dark:text-white">
                {formatINR(shareSummary.sumCents)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400">Expense Total: </span>
              <span className="font-mono font-semibold tabular-nums-ledger text-slate-900 dark:text-white">
                {parsedTotalCents !== null ? formatINR(parsedTotalCents) : '₹0'}
              </span>
            </div>
          </div>

          <div className="text-xs sm:text-sm font-semibold tabular-nums-ledger">
            {parsedTotalCents === null || parsedTotalCents <= 0 ? (
              <span className="text-slate-500 dark:text-slate-400">
                Enter total amount above
              </span>
            ) : selectedMembers.length === 0 ? (
              <span className="text-amber-700 dark:text-amber-400">
                Select at least 1 sharing member
              </span>
            ) : shareSummary.isBalanced ? (
              <span className="text-emerald-700 dark:text-emerald-400">
                Shares match total exactly
              </span>
            ) : shareSummary.diffCents !== null && shareSummary.diffCents > 0 ? (
              <span className="text-red-600 dark:text-red-400">
                {formatINR(shareSummary.diffCents)} remaining to allocate
              </span>
            ) : shareSummary.diffCents !== null && shareSummary.diffCents < 0 ? (
              <span className="text-red-600 dark:text-red-400">
                Exceeds total by {formatINR(Math.abs(shareSummary.diffCents))}
              </span>
            ) : (
              <span className="text-red-600 dark:text-red-400">
                Enter valid amounts for all selected members
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Form Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-[48px] px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0F2557] dark:bg-[#4338CA] text-sm font-semibold text-white hover:bg-[#173473] dark:hover:bg-[#4F46E5] transition-colors whitespace-nowrap"
        >
          <Save className="h-4 w-4" />
          <span>{submitLabel}</span>
        </button>
      </div>
    </form>
  );
};
