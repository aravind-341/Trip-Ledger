import type {
  AppDatabase,
  MemberBalance,
  MemberExpenseEntry,
  SettlementTransfer,
  Trip,
} from '../types/models';
import { formatINR } from './currency';

/**
 * Calculates Total Paid, Total Share, and Net Balance for every member of a trip.
 * Formulas:
 *   Total Paid  = sum(expenses where payerMemberId === member.id)
 *   Total Share = sum(expenseShares where memberId === member.id)
 *   Net Balance = Total Paid - Total Share
 */
export function calculateMemberBalances(
  db: AppDatabase,
  tripId: string
): MemberBalance[] {
  const tripMembers = db.members.filter((m) => m.tripId === tripId);
  const tripExpenses = db.expenses.filter((e) => e.tripId === tripId);
  const tripExpenseIds = new Set(tripExpenses.map((e) => e.id));
  const tripShares = db.expenseShares.filter((s) => tripExpenseIds.has(s.expenseId));

  const paidByMember = new Map<string, number>();
  const shareByMember = new Map<string, number>();

  for (const member of tripMembers) {
    paidByMember.set(member.id, 0);
    shareByMember.set(member.id, 0);
  }

  for (const expense of tripExpenses) {
    const current = paidByMember.get(expense.payerMemberId) ?? 0;
    paidByMember.set(expense.payerMemberId, current + expense.amountCents);
  }

  for (const share of tripShares) {
    const current = shareByMember.get(share.memberId) ?? 0;
    shareByMember.set(share.memberId, current + share.amountCents);
  }

  return tripMembers.map((member) => {
    const totalPaidCents = paidByMember.get(member.id) ?? 0;
    const totalShareCents = shareByMember.get(member.id) ?? 0;
    return {
      memberId: member.id,
      memberName: member.name,
      totalPaidCents,
      totalShareCents,
      netBalanceCents: totalPaidCents - totalShareCents,
    };
  });
}

/**
 * Computes exact settlement transfers in integer cents that bring every member's
 * net balance to zero using a greedy largest-debtor to largest-creditor matching.
 */
export function calculateSettlementTransfers(
  balances: MemberBalance[]
): SettlementTransfer[] {
  interface WorkingNode {
    memberId: string;
    memberName: string;
    remainingCents: number;
  }

  const creditors: WorkingNode[] = balances
    .filter((b) => b.netBalanceCents > 0)
    .map((b) => ({
      memberId: b.memberId,
      memberName: b.memberName,
      remainingCents: b.netBalanceCents,
    }));

  const debtors: WorkingNode[] = balances
    .filter((b) => b.netBalanceCents < 0)
    .map((b) => ({
      memberId: b.memberId,
      memberName: b.memberName,
      remainingCents: Math.abs(b.netBalanceCents),
    }));

  const transfers: SettlementTransfer[] = [];

  // Deterministic ordering: largest amounts first, tie-broken alphabetically by name
  const sortDescending = (a: WorkingNode, b: WorkingNode) => {
    if (b.remainingCents !== a.remainingCents) {
      return b.remainingCents - a.remainingCents;
    }
    return a.memberName.localeCompare(b.memberName);
  };

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort(sortDescending);
    debtors.sort(sortDescending);

    const creditor = creditors[0];
    const debtor = debtors[0];

    const transferCents = Math.min(creditor.remainingCents, debtor.remainingCents);
    if (transferCents <= 0) break;

    transfers.push({
      fromMemberId: debtor.memberId,
      fromMemberName: debtor.memberName,
      toMemberId: creditor.memberId,
      toMemberName: creditor.memberName,
      amountCents: transferCents,
    });

    creditor.remainingCents -= transferCents;
    debtor.remainingCents -= transferCents;

    if (creditor.remainingCents === 0) creditors.shift();
    if (debtor.remainingCents === 0) debtors.shift();
  }

  return transfers;
}

/**
 * Returns only expenses where the selected member is either the payer or a sharing member.
 */
export function getMemberExpenseLedger(
  db: AppDatabase,
  tripId: string,
  memberId: string
): MemberExpenseEntry[] {
  const tripMembers = new Map(
    db.members.filter((m) => m.tripId === tripId).map((m) => [m.id, m.name])
  );
  const tripExpenses = db.expenses.filter((e) => e.tripId === tripId);

  const sharesByExpense = new Map<string, Map<string, number>>();
  for (const share of db.expenseShares) {
    let inner = sharesByExpense.get(share.expenseId);
    if (!inner) {
      inner = new Map<string, number>();
      sharesByExpense.set(share.expenseId, inner);
    }
    inner.set(share.memberId, share.amountCents);
  }

  const entries: MemberExpenseEntry[] = [];

  for (const expense of tripExpenses) {
    const expenseShareMap = sharesByExpense.get(expense.id);
    const isPayer = expense.payerMemberId === memberId;
    const memberShareCents = expenseShareMap?.get(memberId) ?? 0;
    const isSharer = memberShareCents > 0;

    if (!isPayer && !isSharer) {
      continue;
    }

    entries.push({
      expense,
      payerName: tripMembers.get(expense.payerMemberId) ?? 'Unknown',
      paidByMemberCents: isPayer ? expense.amountCents : 0,
      memberShareCents,
      isPayer,
      isSharer,
      sharingMemberCount: expenseShareMap?.size ?? 0,
    });
  }

  return entries.sort((a, b) =>
    b.expense.expenseDate.localeCompare(a.expense.expenseDate)
  );
}

export function getTripTotalCents(db: AppDatabase, tripId: string): number {
  return db.expenses
    .filter((e) => e.tripId === tripId)
    .reduce((sum, e) => sum + e.amountCents, 0);
}

export function formatSettlementSummaryText(
  trip: Trip,
  balances: MemberBalance[],
  transfers: SettlementTransfer[],
  totalExpenseCents: number
): string {
  const lines: string[] = [];
  lines.push(`Trip Settlement Summary — ${trip.name}`);
  lines.push(`Status: ${trip.status === 'settled' ? 'Settled' : 'Active'}`);
  lines.push(`Total Group Expenses: ${formatINR(totalExpenseCents)}`);
  lines.push(`Members: ${balances.length}`);
  lines.push('');
  lines.push('Member Balances:');
  for (const b of balances) {
    const statusLabel =
      b.netBalanceCents > 0
        ? `Receives ${formatINR(b.netBalanceCents)}`
        : b.netBalanceCents < 0
        ? `Owes ${formatINR(Math.abs(b.netBalanceCents))}`
        : 'Settled';
    lines.push(
      `- ${b.memberName}: Paid ${formatINR(b.totalPaidCents)} | Share ${formatINR(
        b.totalShareCents
      )} | Net ${formatINR(b.netBalanceCents, { showSign: true })} (${statusLabel})`
    );
  }
  lines.push('');
  lines.push('Who Pays Whom:');
  if (transfers.length === 0) {
    lines.push('- Everyone is settled. No payments needed.');
  } else {
    transfers.forEach((t, idx) => {
      lines.push(
        `${idx + 1}. ${t.fromMemberName} pays ${t.toMemberName} ${formatINR(t.amountCents)}`
      );
    });
  }

  return lines.join('\n');
}
