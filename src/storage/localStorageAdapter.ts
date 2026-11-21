import { createEmptyDatabase } from '../domain/repository';
import type { AppDatabase } from '../types/models';

export const STORAGE_KEY = 'trip_expense_tracker_db_v1';
export const THEME_STORAGE_KEY = 'trip_expense_tracker_theme_v1';

export type ThemeMode = 'light' | 'dark';

export interface StorageAdapter {
  load(): AppDatabase;
  save(db: AppDatabase): void;
  clear(): void;
}

function isValidDatabaseShape(candidate: unknown): candidate is AppDatabase {
  if (!candidate || typeof candidate !== 'object') return false;
  const obj = candidate as Record<string, unknown>;
  return (
    Array.isArray(obj.trips) &&
    Array.isArray(obj.members) &&
    Array.isArray(obj.expenses) &&
    Array.isArray(obj.expenseShares)
  );
}

export function loadDatabaseFromStorage(
  storage: Pick<Storage, 'getItem'> | null = typeof window !== 'undefined'
    ? window.localStorage
    : null
): AppDatabase {
  if (!storage) {
    return createEmptyDatabase();
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyDatabase();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isValidDatabaseShape(parsed)) {
      return createEmptyDatabase();
    }
    return parsed;
  } catch {
    return createEmptyDatabase();
  }
}

export function saveDatabaseToStorage(
  db: AppDatabase,
  storage: Pick<Storage, 'setItem'> | null = typeof window !== 'undefined'
    ? window.localStorage
    : null
): { ok: boolean; error?: string } {
  if (!storage) {
    return { ok: false, error: 'Local storage is unavailable in this environment.' };
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(db));
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Unable to save trip data to device storage. Please check storage permissions.',
    };
  }
}

export function loadThemePreference(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') {
      return saved;
    }
  } catch {
    // Fallback to default light mode
  }
  return 'light';
}

export function saveThemePreference(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage quota errors for theme preference
  }
}
