import type {
  ActionResult,
  AppDatabase,
  Expense,
  ExpenseInput,
  ExpenseShare,
  Member,
  Trip,
  TripStatus,
} from '../types/models';
import {
  normalizeName,
  validateExpenseInput,
  validateNewMember,
  validateRemoveMember,
  validateTripName,
} from './validation';

export function createEmptyDatabase(): AppDatabase {
  return {
    trips: [],
    members: [],
    expenses: [],
    expenseShares: [],
  };
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTrip(
  db: AppDatabase,
  name: string,
  initialMemberNames: string[] = []
): ActionResult<Trip> {
  const nameError = validateTripName(name);
  if (nameError) {
    return { ok: false, error: nameError };
  }

  const trip: Trip = {
    id: generateId(),
    name: normalizeName(name),
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  let workingDb: AppDatabase = {
    ...db,
    trips: [trip, ...db.trips],
  };

  for (const rawMemberName of initialMemberNames) {
    const cleaned = normalizeName(rawMemberName);
    if (!cleaned) continue;
    const result = addMember(workingDb, trip.id, cleaned);
    if (!result.ok) {
      return { ok: false, error: result.error };
    }
    workingDb = result.data;
  }

  return { ok: true, data: workingDb, value: trip };
}

export function renameTrip(
  db: AppDatabase,
  tripId: string,
  newName: string
): ActionResult<Trip> {
  const existing = db.trips.find((t) => t.id === tripId);
  if (!existing) {
    return { ok: false, error: 'Trip not found.' };
  }

  const nameError = validateTripName(newName);
  if (nameError) {
    return { ok: false, error: nameError };
  }

  const updated: Trip = {
    ...existing,
    name: normalizeName(newName),
  };

  return {
    ok: true,
    data: {
      ...db,
      trips: db.trips.map((t) => (t.id === tripId ? updated : t)),
    },
    value: updated,
  };
}

export function setTripStatus(
  db: AppDatabase,
  tripId: string,
  status: TripStatus
): ActionResult<Trip> {
  const existing = db.trips.find((t) => t.id === tripId);
  if (!existing) {
    return { ok: false, error: 'Trip not found.' };
  }

  const updated: Trip = {
    ...existing,
    status,
  };

  return {
    ok: true,
    data: {
      ...db,
      trips: db.trips.map((t) => (t.id === tripId ? updated : t)),
    },
    value: updated,
  };
}

/**
 * Deletes a trip and cascades deletion to all associated members, expenses, and expense shares.
 */
export function deleteTrip(db: AppDatabase, tripId: string): ActionResult<void> {
  const exists = db.trips.some((t) => t.id === tripId);
  if (!exists) {
    return { ok: false, error: 'Trip not found.' };
  }

  const expenseIdsToRemove = new Set(
    db.expenses.filter((e) => e.tripId === tripId).map((e) => e.id)
  );

  return {
    ok: true,
    data: {
      trips: db.trips.filter((t) => t.id !== tripId),
      members: db.members.filter((m) => m.tripId !== tripId),
      expenses: db.expenses.filter((e) => e.tripId !== tripId),
      expenseShares: db.expenseShares.filter((s) => !expenseIdsToRemove.has(s.expenseId)),
    },
    value: undefined,
  };
}

export function addMember(
  db: AppDatabase,
  tripId: string,
  name: string
): ActionResult<Member> {
  const error = validateNewMember(db, tripId, name);
  if (error) {
    return { ok: false, error };
  }

  const member: Member = {
    id: generateId(),
    tripId,
    name: normalizeName(name),
  };

  return {
    ok: true,
    data: {
      ...db,
      members: [...db.members, member],
    },
    value: member,
  };
}

export function removeMember(db: AppDatabase, memberId: string): ActionResult<void> {
  const error = validateRemoveMember(db, memberId);
  if (error) {
    return { ok: false, error };
  }

  return {
    ok: true,
    data: {
      ...db,
      members: db.members.filter((m) => m.id !== memberId),
    },
    value: undefined,
  };
}

export function addExpense(
  db: AppDatabase,
  input: ExpenseInput
): ActionResult<Expense> {
  const error = validateExpenseInput(db, input);
  if (error) {
    return { ok: false, error };
  }

  const expense: Expense = {
    id: generateId(),
    tripId: input.tripId,
    payerMemberId: input.payerMemberId,
    expenseDate: input.expenseDate.trim(),
    description: normalizeName(input.description),
    amountCents: input.amountCents,
  };

  const newShares: ExpenseShare[] = input.shares.map((s) => ({
    id: generateId(),
    expenseId: expense.id,
    memberId: s.memberId,
    amountCents: s.amountCents,
  }));

  return {
    ok: true,
    data: {
      ...db,
      expenses: [...db.expenses, expense],
      expenseShares: [...db.expenseShares, ...newShares],
    },
    value: expense,
  };
}

export function updateExpense(
  db: AppDatabase,
  expenseId: string,
  input: ExpenseInput
): ActionResult<Expense> {
  const existing = db.expenses.find((e) => e.id === expenseId);
  if (!existing) {
    return { ok: false, error: 'Expense not found.' };
  }
  if (existing.tripId !== input.tripId) {
    return { ok: false, error: 'Expense cannot be moved to another trip.' };
  }

  const error = validateExpenseInput(db, input);
  if (error) {
    return { ok: false, error };
  }

  const updatedExpense: Expense = {
    ...existing,
    payerMemberId: input.payerMemberId,
    expenseDate: input.expenseDate.trim(),
    description: normalizeName(input.description),
    amountCents: input.amountCents,
  };

  const updatedShares: ExpenseShare[] = input.shares.map((s) => ({
    id: generateId(),
    expenseId: existing.id,
    memberId: s.memberId,
    amountCents: s.amountCents,
  }));

  return {
    ok: true,
    data: {
      ...db,
      expenses: db.expenses.map((e) => (e.id === expenseId ? updatedExpense : e)),
      expenseShares: [
        ...db.expenseShares.filter((s) => s.expenseId !== expenseId),
        ...updatedShares,
      ],
    },
    value: updatedExpense,
  };
}

export function deleteExpense(db: AppDatabase, expenseId: string): ActionResult<void> {
  const exists = db.expenses.some((e) => e.id === expenseId);
  if (!exists) {
    return { ok: false, error: 'Expense not found.' };
  }

  return {
    ok: true,
    data: {
      ...db,
      expenses: db.expenses.filter((e) => e.id !== expenseId),
      expenseShares: db.expenseShares.filter((s) => s.expenseId !== expenseId),
    },
    value: undefined,
  };
}
