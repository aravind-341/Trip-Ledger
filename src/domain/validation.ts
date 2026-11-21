import type { AppDatabase, ExpenseInput } from '../types/models';

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

export function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function isValidExpenseDate(dateStr: string): boolean {
  const trimmed = dateStr.trim();
  const match = ISO_DATE_REGEX.exec(trimmed);
  if (!match) return false;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);

  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function validateTripName(name: string): string | null {
  const cleaned = normalizeName(name);
  if (!cleaned) {
    return 'Trip name cannot be empty.';
  }
  if (cleaned.length > 80) {
    return 'Trip name must be 80 characters or fewer.';
  }
  return null;
}

export function validateNewMember(
  db: AppDatabase,
  tripId: string,
  name: string
): string | null {
  const tripExists = db.trips.some((t) => t.id === tripId);
  if (!tripExists) {
    return 'Selected trip does not exist.';
  }

  const cleaned = normalizeName(name);
  if (!cleaned) {
    return 'Member name cannot be empty.';
  }
  if (cleaned.length > 60) {
    return 'Member name must be 60 characters or fewer.';
  }

  const lower = cleaned.toLowerCase();
  const duplicate = db.members.some(
    (m) => m.tripId === tripId && normalizeName(m.name).toLowerCase() === lower
  );
  if (duplicate) {
    return `"${cleaned}" is already a member of this trip.`;
  }

  return null;
}

export function isMemberUsedInTripExpenses(db: AppDatabase, memberId: string): boolean {
  const paidAny = db.expenses.some((e) => e.payerMemberId === memberId);
  if (paidAny) return true;
  return db.expenseShares.some((s) => s.memberId === memberId);
}

export function validateRemoveMember(db: AppDatabase, memberId: string): string | null {
  const member = db.members.find((m) => m.id === memberId);
  if (!member) {
    return 'Member not found.';
  }

  if (isMemberUsedInTripExpenses(db, memberId)) {
    return `${member.name} cannot be removed because they are part of one or more expenses. Edit or delete those expenses first.`;
  }

  return null;
}

export function validateExpenseInput(db: AppDatabase, input: ExpenseInput): string | null {
  const trip = db.trips.find((t) => t.id === input.tripId);
  if (!trip) {
    return 'Selected trip does not exist.';
  }

  const description = normalizeName(input.description);
  if (!description) {
    return 'Expense description is required.';
  }
  if (description.length > 140) {
    return 'Expense description must be 140 characters or fewer.';
  }

  if (!isValidExpenseDate(input.expenseDate)) {
    return 'Please select a valid expense date.';
  }

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    return 'Expense amount must be greater than ₹0.';
  }

  const tripMemberIds = new Set(
    db.members.filter((m) => m.tripId === input.tripId).map((m) => m.id)
  );

  if (!input.payerMemberId || !tripMemberIds.has(input.payerMemberId)) {
    return 'Please select a valid payer who belongs to this trip.';
  }

  if (!input.shares || input.shares.length === 0) {
    return 'Select at least one member who shares this expense.';
  }

  const seenMemberIds = new Set<string>();
  let shareSumCents = 0;

  for (const share of input.shares) {
    if (!tripMemberIds.has(share.memberId)) {
      return 'All sharing members must belong to this trip.';
    }
    if (seenMemberIds.has(share.memberId)) {
      return 'Duplicate sharing members are not allowed in the same expense.';
    }
    seenMemberIds.add(share.memberId);

    if (!Number.isInteger(share.amountCents) || share.amountCents <= 0) {
      return 'Each selected member must have a share amount greater than ₹0.';
    }
    shareSumCents += share.amountCents;
  }

  if (shareSumCents !== input.amountCents) {
    return 'The sum of individual shares must equal the total expense amount.';
  }

  return null;
}
