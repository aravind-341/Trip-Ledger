import { useCallback, useEffect, useState } from 'react';

export type AppRoute =
  | { screen: 'home' }
  | { screen: 'create-trip' }
  | { screen: 'trip-details'; tripId: string }
  | { screen: 'trip-members'; tripId: string }
  | { screen: 'add-expense'; tripId: string }
  | { screen: 'expense-details'; tripId: string; expenseId: string }
  | { screen: 'edit-expense'; tripId: string; expenseId: string }
  | { screen: 'member-expenses'; tripId: string; memberId: string }
  | { screen: 'settlement'; tripId: string }
  | { screen: 'trip-settings'; tripId: string };

export function routeToHash(route: AppRoute): string {
  switch (route.screen) {
    case 'home':
      return '#/';
    case 'create-trip':
      return '#/trips/new';
    case 'trip-details':
      return `#/trips/${encodeURIComponent(route.tripId)}`;
    case 'trip-members':
      return `#/trips/${encodeURIComponent(route.tripId)}/members`;
    case 'add-expense':
      return `#/trips/${encodeURIComponent(route.tripId)}/expenses/new`;
    case 'expense-details':
      return `#/trips/${encodeURIComponent(route.tripId)}/expenses/${encodeURIComponent(
        route.expenseId
      )}`;
    case 'edit-expense':
      return `#/trips/${encodeURIComponent(route.tripId)}/expenses/${encodeURIComponent(
        route.expenseId
      )}/edit`;
    case 'member-expenses':
      return `#/trips/${encodeURIComponent(route.tripId)}/members/${encodeURIComponent(
        route.memberId
      )}`;
    case 'settlement':
      return `#/trips/${encodeURIComponent(route.tripId)}/settlement`;
    case 'trip-settings':
      return `#/trips/${encodeURIComponent(route.tripId)}/settings`;
  }
}

export function parseHashToRoute(hash: string): AppRoute {
  const cleaned = hash.replace(/^#/, '').replace(/\/+$/, '') || '/';
  const segments = cleaned.split('/').filter(Boolean).map(decodeURIComponent);

  if (segments.length === 0) {
    return { screen: 'home' };
  }

  if (segments[0] === 'trips') {
    if (segments.length === 2 && segments[1] === 'new') {
      return { screen: 'create-trip' };
    }
    if (segments.length >= 2) {
      const tripId = segments[1];
      if (segments.length === 2) {
        return { screen: 'trip-details', tripId };
      }
      if (segments[2] === 'members') {
        if (segments.length === 3) {
          return { screen: 'trip-members', tripId };
        }
        if (segments.length === 4) {
          return { screen: 'member-expenses', tripId, memberId: segments[3] };
        }
      }
      if (segments[2] === 'expenses') {
        if (segments.length === 4 && segments[3] === 'new') {
          return { screen: 'add-expense', tripId };
        }
        if (segments.length === 4) {
          return { screen: 'expense-details', tripId, expenseId: segments[3] };
        }
        if (segments.length === 5 && segments[4] === 'edit') {
          return { screen: 'edit-expense', tripId, expenseId: segments[3] };
        }
      }
      if (segments.length === 3 && segments[2] === 'settlement') {
        return { screen: 'settlement', tripId };
      }
      if (segments.length === 3 && segments[2] === 'settings') {
        return { screen: 'trip-settings', tripId };
      }
    }
  }

  return { screen: 'home' };
}

export function useRouter() {
  const [route, setRoute] = useState<AppRoute>(() =>
    parseHashToRoute(typeof window !== 'undefined' ? window.location.hash : '#/')
  );

  useEffect(() => {
    const handleHashChange = () => {
      setRoute(parseHashToRoute(window.location.hash));
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((nextRoute: AppRoute, options?: { replace?: boolean }) => {
    const nextHash = routeToHash(nextRoute);
    if (typeof window !== 'undefined') {
      if (options?.replace) {
        window.location.replace(nextHash);
      } else if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      }
    }
    setRoute(nextRoute);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, []);

  return { route, navigate };
}
