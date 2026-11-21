# Trip Expense Tracker

A local-first, offline-capable group trip expense manager built for a single organizer to record shared expenses, assign custom individual shares in Indian Rupees (`₹`), inspect person-wise ledgers, and compute exact settlement transfers.

## Platform Note (Google AI Studio Build Environment)

This Google AI Studio Build workspace supports **React 19 + Vite + TypeScript + Tailwind CSS (Web / Android-installable Progressive Web App)** rather than a native React Native / Expo runtime.

To satisfy the mobile-first Android usability and offline local-first requirements without relying on any backend or cloud database, this project is built as an **Android-compatible Progressive Web App (PWA)** using `vite-plugin-pwa` with:

- Standalone home-screen installation on Android Chrome (and iOS Safari)
- Offline service worker caching
- Local device persistence (`localStorage`) using the exact required JSON structure
- Pure, platform-agnostic business logic (`src/domain/` and `src/types/`) that can be reused directly without modification if ported to a native React Native / Expo UI later

---

## Features

1. **Home Dashboard**: Total trips, total recorded expenses, total tracked expenditure (`₹`), search and status filters (`All` / `Active` / `Settled`), and an empty state guiding the organizer to create their first trip.
2. **Trip Management**: Create trips, view all trips, open trips, rename trips, mark trips as settled or reopen them, export trip JSON backups, and delete trips with confirmation (cascading deletion of associated members, expenses, and expense shares).
3. **Member Management**: Add friends by name only (no login, phone, or email), duplicate name protection per trip, initials-based avatars, and deletion protection preventing removal of members referenced by any expense.
4. **Custom Expense Sharing**: Record expense date, description, total amount (`₹`), payer (independent of who shares), select any subset of trip members (unselected members automatically receive `₹0`), enter exact manual shares per member (with an optional explicit equal-split helper), and live validation requiring `Sum of Individual Shares === Total Expense Amount`.
5. **Expense History & Details**: Newest-first and oldest-first sorting, full expense detail breakdown, editing, and confirmed deletion.
6. **Person-wise Expense View**: Individual member summary (`Total Paid`, `Total Assigned Share`, `Net Balance`) and filtered ledger (`All` / `Paid` / `Shared`) displaying strictly related expenses.
7. **Settlement Calculator**: Computes exact integer-paise balances (`Total Paid - Total Share`), generates minimal `Who Pays Whom` transfers that bring every member's balance to `₹0`, handles all-settled and no-expense states, and provides a one-tap **Copy Settlement Summary** button.
8. **Light & Dark Mode**: Defaults to a crisp Light Mode (Navy Blue `#0F2557`, Indigo `#4338CA`, Very Light Gray `#F5F7FA`, White cards, Green positive balances, Red negative balances) with an optional Dark Mode toggle.

---

## Architecture & Project Structure

```text
src/
├── types/
│   └── models.ts                  # Exact JSON schema: trips, members, expenses, expenseShares
├── domain/
│   ├── currency.ts                # Exact integer-paise parser & Indian Rupee (en-IN) formatter
│   ├── dates.ts                   # Date formatting and initials helpers
│   ├── validation.ts              # All 13 domain validation rules
│   ├── settlement.ts              # Balance, minimal transfer solver, person-wise ledger
│   └── repository.ts              # Pure state transitions & cascading delete logic
├── storage/
│   └── localStorageAdapter.ts     # Isolated local device JSON storage persistence
├── navigation/
│   └── router.ts                  # Typed hash router covering all 10 screens
├── state/
│   └── TripContext.tsx            # React context wiring repository + storage + theme
├── hooks/
│   └── usePWAInstall.ts           # Android/iOS install prompt & offline detection
├── components/
│   ├── AppShell.tsx               # Responsive mobile-first + desktop layout shell
│   ├── Avatar.tsx                 # Initials-based circular avatars
│   ├── ConfirmDialog.tsx          # Accessible confirmation modal
│   ├── ExpenseForm.tsx            # Shared Add/Edit expense form with custom sharing
│   └── PWAInstallButton.tsx       # In-app PWA install button & offline banner
├── screens/
│   ├── HomeDashboardScreen.tsx
│   ├── CreateTripScreen.tsx
│   ├── TripDetailsScreen.tsx
│   ├── TripMembersScreen.tsx
│   ├── ExpenseFormScreen.tsx
│   ├── ExpenseDetailsScreen.tsx
│   ├── MemberExpensesScreen.tsx
│   ├── SettlementScreen.tsx
│   └── TripSettingsScreen.tsx
└── tests/
    └── tripExpenseTracker.test.ts # Automated Vitest suite (all 15 scenarios + Goa Trip)
```

---

## Data Structure

All data is persisted locally as JSON under `localStorage` (`trip_expense_tracker_db_v1`) using integer paise (`amountCents`, where `100` = `₹1.00`) to eliminate floating-point rounding errors:

```json
{
  "trips": [
    { "id": "...", "name": "Goa Trip", "status": "active", "createdAt": "2026-11-20T08:00:00.000Z" }
  ],
  "members": [
    { "id": "...", "tripId": "...", "name": "Aravind" }
  ],
  "expenses": [
    {
      "id": "...",
      "tripId": "...",
      "payerMemberId": "...",
      "expenseDate": "2026-11-10",
      "description": "Dinner",
      "amountCents": 120000
    }
  ],
  "expenseShares": [
    { "id": "...", "expenseId": "...", "memberId": "...", "amountCents": 40000 }
  ]
}
```

---

## Installation & Running Locally

### Prerequisites
- Node.js 18+ and npm

### Setup & Development

```bash
# 1. Install dependencies
npm install

# 2. Start the development server (http://localhost:3000)
npm run dev

# 3. Run automated unit & integration tests (all 15 scenarios + Goa Trip math)
npm test

# 4. Type-check the codebase
npm run lint

# 5. Build for production
npm run build
```

### Installing on Android Phones (PWA)
1. Open the hosted URL in **Google Chrome on Android**.
2. Tap the in-app **Install App** button (or Chrome menu -> **Add to Home screen / Install app**).
3. Launch **Trip Expense Tracker** directly from your Android home screen — it runs in standalone mode and works completely offline.
