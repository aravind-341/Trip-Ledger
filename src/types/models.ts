export type TripStatus = 'active' | 'settled';

export interface Trip {
  id: string;
  name: string;
  status: TripStatus;
  createdAt: string; // ISO-8601 timestamp
}

export interface Member {
  id: string;
  tripId: string;
  name: string;
}

export interface Expense {
  id: string;
  tripId: string;
  payerMemberId: string;
  expenseDate: string; // YYYY-MM-DD
  description: string;
  amountCents: number; // Integer paise (100 = ₹1.00)
}

export interface ExpenseShare {
  id: string;
  expenseId: string;
  memberId: string;
  amountCents: number; // Integer paise (100 = ₹1.00)
}

export interface AppDatabase {
  trips: Trip[];
  members: Member[];
  expenses: Expense[];
  expenseShares: ExpenseShare[];
}

export interface ShareInput {
  memberId: string;
  amountCents: number;
}

export interface ExpenseInput {
  tripId: string;
  payerMemberId: string;
  expenseDate: string;
  description: string;
  amountCents: number;
  shares: ShareInput[];
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  totalPaidCents: number;
  totalShareCents: number;
  netBalanceCents: number;
}

export interface SettlementTransfer {
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amountCents: number;
}

export interface MemberExpenseEntry {
  expense: Expense;
  payerName: string;
  paidByMemberCents: number;
  memberShareCents: number;
  isPayer: boolean;
  isSharer: boolean;
  sharingMemberCount: number;
}

export type ActionResult<T = void> =
  | { ok: true; data: AppDatabase; value: T }
  | { ok: false; error: string };
