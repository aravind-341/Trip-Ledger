import React from 'react';
import { useRouter } from './navigation/router';
import { CreateTripScreen } from './screens/CreateTripScreen';
import { ExpenseDetailsScreen } from './screens/ExpenseDetailsScreen';
import { ExpenseFormScreen } from './screens/ExpenseFormScreen';
import { HomeDashboardScreen } from './screens/HomeDashboardScreen';
import { MemberExpensesScreen } from './screens/MemberExpensesScreen';
import { SettlementScreen } from './screens/SettlementScreen';
import { TripDetailsScreen } from './screens/TripDetailsScreen';
import { TripMembersScreen } from './screens/TripMembersScreen';
import { TripSettingsScreen } from './screens/TripSettingsScreen';
import { TripProvider } from './state/TripContext';

const AppRouterView: React.FC = () => {
  const { route, navigate } = useRouter();

  switch (route.screen) {
    case 'home':
      return <HomeDashboardScreen route={route} navigate={navigate} />;
    case 'create-trip':
      return <CreateTripScreen route={route} navigate={navigate} />;
    case 'trip-details':
      return (
        <TripDetailsScreen
          route={route}
          tripId={route.tripId}
          navigate={navigate}
        />
      );
    case 'trip-members':
      return (
        <TripMembersScreen
          route={route}
          tripId={route.tripId}
          navigate={navigate}
        />
      );
    case 'add-expense':
      return (
        <ExpenseFormScreen
          route={route}
          tripId={route.tripId}
          navigate={navigate}
        />
      );
    case 'edit-expense':
      return (
        <ExpenseFormScreen
          route={route}
          tripId={route.tripId}
          expenseId={route.expenseId}
          navigate={navigate}
        />
      );
    case 'expense-details':
      return (
        <ExpenseDetailsScreen
          route={route}
          tripId={route.tripId}
          expenseId={route.expenseId}
          navigate={navigate}
        />
      );
    case 'member-expenses':
      return (
        <MemberExpensesScreen
          route={route}
          tripId={route.tripId}
          memberId={route.memberId}
          navigate={navigate}
        />
      );
    case 'settlement':
      return (
        <SettlementScreen
          route={route}
          tripId={route.tripId}
          navigate={navigate}
        />
      );
    case 'trip-settings':
      return (
        <TripSettingsScreen
          route={route}
          tripId={route.tripId}
          navigate={navigate}
        />
      );
  }
};

export default function App() {
  return (
    <TripProvider>
      <AppRouterView />
    </TripProvider>
  );
}
