import { describe, expect, it } from 'vitest';
import {
  centsToInputString,
  formatINR,
  parseRupeesToCents,
  splitCentsEqually,
} from '../domain/currency';
import {
  addExpense,
  addMember,
  createEmptyDatabase,
  createTrip,
  deleteExpense,
  deleteTrip,
  removeMember,
  renameTrip,
  setTripStatus,
  updateExpense,
} from '../domain/repository';
import {
  calculateMemberBalances,
  calculateSettlementTransfers,
  formatSettlementSummaryText,
  getMemberExpenseLedger,
  getTripTotalCents,
} from '../domain/settlement';
import {
  loadDatabaseFromStorage,
  saveDatabaseToStorage,
} from '../storage/localStorageAdapter';
import type { AppDatabase } from '../types/models';

function createMemoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const map = new Map<string, string>();
  return {
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

function unwrap<T>(res: { ok: true; data: AppDatabase; value: T } | { ok: false; error: string }) {
  if (!res.ok) {
    throw new Error(`Expected ok result, received error: ${res.error}`);
  }
  return res;
}

describe('Currency integer-cents precision and INR formatting', () => {
  it('parses rupees to exact integer paise without floating-point drift', () => {
    expect(parseRupeesToCents('1200')).toBe(120000);
    expect(parseRupeesToCents('1,200.50')).toBe(120050);
    expect(parseRupeesToCents('₹19.99')).toBe(1999);
    expect(parseRupeesToCents('0.1')).toBe(10);
    expect(parseRupeesToCents('-50')).toBeNull();
    expect(parseRupeesToCents('abc')).toBeNull();
    expect(parseRupeesToCents('12.345')).toBeNull();
  });

  it('formats Indian Rupees accurately with signs and Indian grouping', () => {
    expect(formatINR(120000)).toBe('₹1,200');
    expect(formatINR(120050)).toBe('₹1,200.50');
    expect(formatINR(12500000)).toBe('₹1,25,000');
    expect(formatINR(100000, { showSign: true })).toBe('+₹1,000');
    expect(formatINR(-60000, { showSign: true })).toBe('-₹600');
    expect(centsToInputString(40050)).toBe('400.50');
  });

  it('distributes remainder paise cleanly on optional equal split', () => {
    const shares = splitCentsEqually(10000, 3); // ₹100 / 3
    expect(shares).toEqual([3334, 3333, 3333]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10000);
  });
});

describe('All 15 Functional Scenarios & Validation Rules', () => {
  it('Scenario 1, 2, 3: creates multiple independent trips, adds members, prevents duplicate names', () => {
    let db = createEmptyDatabase();

    // Empty trip name rejected
    const emptyTrip = createTrip(db, '   ');
    expect(emptyTrip.ok).toBe(false);

    const t1 = unwrap(createTrip(db, 'Goa Trip'));
    db = t1.data;
    const t2 = unwrap(createTrip(db, 'Ooty Weekend'));
    db = t2.data;

    expect(db.trips).toHaveLength(2);

    // Add members to Trip 1
    db = unwrap(addMember(db, t1.value.id, 'Aravind')).data;
    db = unwrap(addMember(db, t1.value.id, 'Chandu')).data;

    // Duplicate member (case/whitespace insensitive) in same trip rejected
    const dupRes = addMember(db, t1.value.id, '  aravind ');
    expect(dupRes.ok).toBe(false);

    // Same member name in DIFFERENT trip is allowed (independent trip data)
    const otherTripMember = addMember(db, t2.value.id, 'Aravind');
    expect(otherTripMember.ok).toBe(true);
    db = unwrap(otherTripMember).data;

    // Empty member name rejected
    expect(addMember(db, t1.value.id, '   ').ok).toBe(false);

    expect(db.members.filter((m) => m.tripId === t1.value.id)).toHaveLength(2);
    expect(db.members.filter((m) => m.tripId === t2.value.id)).toHaveLength(1);
  });

  it('Scenario 4, 5, 6, 7, 8, 9: custom subset sharing, validation, payer change, edit & delete', () => {
    let db = createEmptyDatabase();
    const tripRes = unwrap(
      createTrip(db, 'Goa Trip', ['Aravind', 'Chandu', 'Somu', 'Hemanth'])
    );
    db = tripRes.data;
    const tripId = tripRes.value.id;

    const [aravind, chandu, somu, hemanth] = db.members.filter(
      (m) => m.tripId === tripId
    );

    // Reject incorrect share totals (Scenario 6)
    const badTotal = addExpense(db, {
      tripId,
      payerMemberId: aravind.id,
      expenseDate: '2026-11-15',
      description: 'Dinner',
      amountCents: 120000,
      shares: [
        { memberId: aravind.id, amountCents: 40000 },
        { memberId: chandu.id, amountCents: 40000 },
      ],
    });
    expect(badTotal.ok).toBe(false);

    // Reject duplicate share member
    const dupShare = addExpense(db, {
      tripId,
      payerMemberId: aravind.id,
      expenseDate: '2026-11-15',
      description: 'Dinner',
      amountCents: 80000,
      shares: [
        { memberId: aravind.id, amountCents: 40000 },
        { memberId: aravind.id, amountCents: 40000 },
      ],
    });
    expect(dupShare.ok).toBe(false);

    // Reject invalid date
    const badDate = addExpense(db, {
      tripId,
      payerMemberId: aravind.id,
      expenseDate: '2026-02-30',
      description: 'Dinner',
      amountCents: 40000,
      shares: [{ memberId: aravind.id, amountCents: 40000 }],
    });
    expect(badDate.ok).toBe(false);

    // Reject zero/negative share
    const zeroShare = addExpense(db, {
      tripId,
      payerMemberId: aravind.id,
      expenseDate: '2026-11-15',
      description: 'Dinner',
      amountCents: 120000,
      shares: [
        { memberId: aravind.id, amountCents: 120000 },
        { memberId: chandu.id, amountCents: 0 },
      ],
    });
    expect(zeroShare.ok).toBe(false);

    // Scenario 4 & 5: Dinner ₹1,200 shared ONLY by Aravind, Chandu, Somu (Hemanth = ₹0)
    const expRes = unwrap(
      addExpense(db, {
        tripId,
        payerMemberId: aravind.id,
        expenseDate: '2026-11-15',
        description: 'Dinner',
        amountCents: 120000,
        shares: [
          { memberId: aravind.id, amountCents: 40000 },
          { memberId: chandu.id, amountCents: 40000 },
          { memberId: somu.id, amountCents: 40000 },
        ],
      })
    );
    db = expRes.data;

    // Verify Hemanth has ₹0 share and does NOT see Dinner in his person-wise ledger (Scenario 10)
    const hemanthLedger = getMemberExpenseLedger(db, tripId, hemanth.id);
    expect(hemanthLedger).toHaveLength(0);

    // Scenario 7 & 8: Change payer to Hemanth (payer does not share!) and edit custom amounts
    const editedRes = unwrap(
      updateExpense(db, expRes.value.id, {
        tripId,
        payerMemberId: hemanth.id,
        expenseDate: '2026-11-16',
        description: 'Beach Dinner',
        amountCents: 120000,
        shares: [
          { memberId: aravind.id, amountCents: 50000 },
          { memberId: chandu.id, amountCents: 40000 },
          { memberId: somu.id, amountCents: 30000 },
        ],
      })
    );
    db = editedRes.data;

    const balancesAfterEdit = calculateMemberBalances(db, tripId);
    const byId = new Map(balancesAfterEdit.map((b) => [b.memberId, b]));
    expect(byId.get(hemanth.id)?.totalPaidCents).toBe(120000);
    expect(byId.get(hemanth.id)?.totalShareCents).toBe(0);
    expect(byId.get(hemanth.id)?.netBalanceCents).toBe(120000);
    expect(byId.get(aravind.id)?.netBalanceCents).toBe(-50000);

    // Scenario 9: Delete expense
    db = unwrap(deleteExpense(db, expRes.value.id)).data;
    expect(db.expenses).toHaveLength(0);
    expect(db.expenseShares).toHaveLength(0);
  });

  it('Scenario 12, 13, 14: member deletion guard, unused member deletion, and cascading trip deletion', () => {
    let db = createEmptyDatabase();
    const t1 = unwrap(createTrip(db, 'Trip One', ['Aravind', 'Chandu', 'UnusedFriend']));
    db = t1.data;
    const t2 = unwrap(createTrip(db, 'Trip Two', ['Kiran']));
    db = t2.data;

    const [aravind, chandu, unused] = db.members.filter(
      (m) => m.tripId === t1.value.id
    );

    db = unwrap(
      addExpense(db, {
        tripId: t1.value.id,
        payerMemberId: aravind.id,
        expenseDate: '2026-11-10',
        description: 'Cab',
        amountCents: 60000,
        shares: [
          { memberId: aravind.id, amountCents: 30000 },
          { memberId: chandu.id, amountCents: 30000 },
        ],
      })
    ).data;

    // Scenario 13: Cannot delete payer or sharing member
    expect(removeMember(db, aravind.id).ok).toBe(false);
    expect(removeMember(db, chandu.id).ok).toBe(false);

    // Scenario 12: Can delete unused member
    db = unwrap(removeMember(db, unused.id)).data;
    expect(db.members.some((m) => m.id === unused.id)).toBe(false);

    // Rename & settle/reopen trip
    db = unwrap(renameTrip(db, t1.value.id, 'Trip One Updated')).data;
    db = unwrap(setTripStatus(db, t1.value.id, 'settled')).data;
    expect(db.trips.find((t) => t.id === t1.value.id)?.status).toBe('settled');
    db = unwrap(setTripStatus(db, t1.value.id, 'active')).data;
    expect(db.trips.find((t) => t.id === t1.value.id)?.status).toBe('active');

    // Scenario 14: Cascading trip deletion preserves Trip Two cleanly
    db = unwrap(deleteTrip(db, t1.value.id)).data;
    expect(db.trips).toHaveLength(1);
    expect(db.trips[0].id).toBe(t2.value.id);
    expect(db.members).toHaveLength(1);
    expect(db.expenses).toHaveLength(0);
    expect(db.expenseShares).toHaveLength(0);
  });

  it('Scenario 15: persists and restores full database across simulated app restart', () => {
    const storage = createMemoryStorage();
    let db = createEmptyDatabase();

    const trip = unwrap(createTrip(db, 'Persistence Test Trip', ['Aravind', 'Chandu']));
    db = trip.data;
    const [aravind, chandu] = db.members;

    db = unwrap(
      addExpense(db, {
        tripId: trip.value.id,
        payerMemberId: aravind.id,
        expenseDate: '2026-11-18',
        description: 'Coffee',
        amountCents: 50000,
        shares: [
          { memberId: aravind.id, amountCents: 25000 },
          { memberId: chandu.id, amountCents: 25000 },
        ],
      })
    ).data;

    const saveRes = saveDatabaseToStorage(db, storage);
    expect(saveRes.ok).toBe(true);

    // Simulate cold app restart
    const reloaded = loadDatabaseFromStorage(storage);
    expect(reloaded).toEqual(db);
  });
});

describe('Scenario 11 & Section 16: Goa Trip Complete Mathematical Verification', () => {
  it('verifies all totals, person-wise ledgers, and exact settlement transfers for Goa Trip', () => {
    let db = createEmptyDatabase();
    const tripRes = unwrap(
      createTrip(db, 'Goa Trip', ['Aravind', 'Chandu', 'Somu', 'Hemanth'])
    );
    db = tripRes.data;
    const tripId = tripRes.value.id;

    const [aravind, chandu, somu, hemanth] = db.members.filter(
      (m) => m.tripId === tripId
    );

    // 1. Hotel – ₹4,000 | Paid by Aravind | Shared equally by all 4 (₹1,000 each)
    db = unwrap(
      addExpense(db, {
        tripId,
        payerMemberId: aravind.id,
        expenseDate: '2026-11-10',
        description: 'Hotel',
        amountCents: 400000,
        shares: [
          { memberId: aravind.id, amountCents: 100000 },
          { memberId: chandu.id, amountCents: 100000 },
          { memberId: somu.id, amountCents: 100000 },
          { memberId: hemanth.id, amountCents: 100000 },
        ],
      })
    ).data;

    // 2. Dinner – ₹1,200 | Paid by Chandu | Shared ONLY by Aravind, Chandu, Somu (₹400 each; Hemanth = ₹0)
    db = unwrap(
      addExpense(db, {
        tripId,
        payerMemberId: chandu.id,
        expenseDate: '2026-11-10',
        description: 'Dinner',
        amountCents: 120000,
        shares: [
          { memberId: aravind.id, amountCents: 40000 },
          { memberId: chandu.id, amountCents: 40000 },
          { memberId: somu.id, amountCents: 40000 },
        ],
      })
    ).data;

    // 3. Petrol – ₹2,000 | Paid by Somu | Custom shares: Aravind ₹500, Chandu ₹500, Somu ₹500, Hemanth ₹500
    db = unwrap(
      addExpense(db, {
        tripId,
        payerMemberId: somu.id,
        expenseDate: '2026-11-11',
        description: 'Petrol',
        amountCents: 200000,
        shares: [
          { memberId: aravind.id, amountCents: 50000 },
          { memberId: chandu.id, amountCents: 50000 },
          { memberId: somu.id, amountCents: 50000 },
          { memberId: hemanth.id, amountCents: 50000 },
        ],
      })
    ).data;

    // 4. Breakfast – ₹800 | Paid by Hemanth | Shared ONLY by Chandu (₹300) and Hemanth (₹500)
    db = unwrap(
      addExpense(db, {
        tripId,
        payerMemberId: hemanth.id,
        expenseDate: '2026-11-11',
        description: 'Breakfast',
        amountCents: 80000,
        shares: [
          { memberId: chandu.id, amountCents: 30000 },
          { memberId: hemanth.id, amountCents: 50000 },
        ],
      })
    ).data;

    // 5. Activities – ₹2,000 | Paid by Aravind | Custom uneven shares: Aravind ₹600, Chandu ₹400, Somu ₹700, Hemanth ₹300
    db = unwrap(
      addExpense(db, {
        tripId,
        payerMemberId: aravind.id,
        expenseDate: '2026-11-12',
        description: 'Activities',
        amountCents: 200000,
        shares: [
          { memberId: aravind.id, amountCents: 60000 },
          { memberId: chandu.id, amountCents: 40000 },
          { memberId: somu.id, amountCents: 70000 },
          { memberId: hemanth.id, amountCents: 30000 },
        ],
      })
    ).data;

    // Manual mathematical verification:
    // Total Trip Spend = 4000 + 1200 + 2000 + 800 + 2000 = ₹10,000 (1,000,000 cents)
    expect(getTripTotalCents(db, tripId)).toBe(1000000);

    // Individual Paid & Share totals:
    // Aravind: Paid = 4000 + 2000 = ₹6,000 | Share = 1000 + 400 + 500 + 0 + 600 = ₹2,500 | Net = +₹3,500
    // Chandu:  Paid = 1200 = ₹1,200        | Share = 1000 + 400 + 500 + 300 + 400 = ₹2,600 | Net = -₹1,400
    // Somu:    Paid = 2000 = ₹2,000        | Share = 1000 + 400 + 500 + 0 + 700 = ₹2,600 | Net = -₹600
    // Hemanth: Paid = 800 = ₹800           | Share = 1000 + 0 + 500 + 500 + 300 = ₹2,300 | Net = -₹1,500
    // Sum of Nets = +3500 - 1400 - 600 - 1500 = 0
    const balances = calculateMemberBalances(db, tripId);
    const byName = new Map(balances.map((b) => [b.memberName, b]));

    expect(byName.get('Aravind')).toMatchObject({
      totalPaidCents: 600000,
      totalShareCents: 250000,
      netBalanceCents: 350000,
    });
    expect(byName.get('Chandu')).toMatchObject({
      totalPaidCents: 120000,
      totalShareCents: 260000,
      netBalanceCents: -140000,
    });
    expect(byName.get('Somu')).toMatchObject({
      totalPaidCents: 200000,
      totalShareCents: 260000,
      netBalanceCents: -60000,
    });
    expect(byName.get('Hemanth')).toMatchObject({
      totalPaidCents: 80000,
      totalShareCents: 230000,
      netBalanceCents: -150000,
    });

    // Zero-sum invariant
    const netSum = balances.reduce((sum, b) => sum + b.netBalanceCents, 0);
    expect(netSum).toBe(0);

    // Person-wise ledger check: Hemanth was NOT part of Dinner (should only see 4 expenses)
    const hemanthLedger = getMemberExpenseLedger(db, tripId, hemanth.id);
    expect(hemanthLedger).toHaveLength(4);
    expect(hemanthLedger.some((e) => e.expense.description === 'Dinner')).toBe(false);

    // Aravind was NOT part of Breakfast (should only see 4 expenses)
    const aravindLedger = getMemberExpenseLedger(db, tripId, aravind.id);
    expect(aravindLedger).toHaveLength(4);
    expect(aravindLedger.some((e) => e.expense.description === 'Breakfast')).toBe(false);

    // Exact settlement transfers:
    // Hemanth pays Aravind ₹1,500
    // Chandu pays Aravind ₹1,400
    // Somu pays Aravind ₹600
    const transfers = calculateSettlementTransfers(balances);
    expect(transfers).toHaveLength(3);
    expect(transfers).toEqual([
      {
        fromMemberId: hemanth.id,
        fromMemberName: 'Hemanth',
        toMemberId: aravind.id,
        toMemberName: 'Aravind',
        amountCents: 150000,
      },
      {
        fromMemberId: chandu.id,
        fromMemberName: 'Chandu',
        toMemberId: aravind.id,
        toMemberName: 'Aravind',
        amountCents: 140000,
      },
      {
        fromMemberId: somu.id,
        fromMemberName: 'Somu',
        toMemberId: aravind.id,
        toMemberName: 'Aravind',
        amountCents: 60000,
      },
    ]);

    // Verify applying all transfers brings EVERY member's net balance to strictly 0
    const finalPositions = new Map(
      balances.map((b) => [b.memberId, b.netBalanceCents])
    );
    for (const t of transfers) {
      finalPositions.set(
        t.fromMemberId,
        (finalPositions.get(t.fromMemberId) ?? 0) + t.amountCents
      );
      finalPositions.set(
        t.toMemberId,
        (finalPositions.get(t.toMemberId) ?? 0) - t.amountCents
      );
    }
    for (const remaining of finalPositions.values()) {
      expect(remaining).toBe(0);
    }

    // Verify formatted settlement summary text
    const summaryText = formatSettlementSummaryText(
      tripRes.value,
      balances,
      transfers,
      1000000
    );
    expect(summaryText).toContain('Goa Trip');
    expect(summaryText).toContain('Hemanth pays Aravind ₹1,500');
    expect(summaryText).toContain('Chandu pays Aravind ₹1,400');
    expect(summaryText).toContain('Somu pays Aravind ₹600');
  });
});
