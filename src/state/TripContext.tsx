import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  addExpense as addExpenseOp,
  addMember as addMemberOp,
  createTrip as createTripOp,
  deleteExpense as deleteExpenseOp,
  deleteTrip as deleteTripOp,
  removeMember as removeMemberOp,
  renameTrip as renameTripOp,
  setTripStatus as setTripStatusOp,
  updateExpense as updateExpenseOp,
} from '../domain/repository';
import {
  loadDatabaseFromStorage,
  loadThemePreference,
  saveDatabaseToStorage,
  saveThemePreference,
  type ThemeMode,
} from '../storage/localStorageAdapter';
import type {
  ActionResult,
  AppDatabase,
  Expense,
  ExpenseInput,
  Member,
  Trip,
  TripStatus,
} from '../types/models';

export interface ToastMessage {
  id: string;
  text: string;
  tone: 'success' | 'error' | 'info';
}

interface TripContextValue {
  db: AppDatabase;
  theme: ThemeMode;
  storageError: string | null;
  toast: ToastMessage | null;
  toggleTheme: () => void;
  showToast: (text: string, tone?: 'success' | 'error' | 'info') => void;
  dismissToast: () => void;
  createTrip: (name: string, initialMembers?: string[]) => ActionResult<Trip>;
  renameTrip: (tripId: string, newName: string) => ActionResult<Trip>;
  setTripStatus: (tripId: string, status: TripStatus) => ActionResult<Trip>;
  deleteTrip: (tripId: string) => ActionResult<void>;
  addMember: (tripId: string, name: string) => ActionResult<Member>;
  removeMember: (memberId: string) => ActionResult<void>;
  addExpense: (input: ExpenseInput) => ActionResult<Expense>;
  updateExpense: (expenseId: string, input: ExpenseInput) => ActionResult<Expense>;
  deleteExpense: (expenseId: string) => ActionResult<void>;
}

const TripContext = createContext<TripContextValue | null>(null);

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AppDatabase>(() => loadDatabaseFromStorage());
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemePreference());
  const [storageError, setStorageError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveThemePreference(theme);
  }, [theme]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback(
    (text: string, tone: 'success' | 'error' | 'info' = 'success') => {
      setToast({ id: String(Date.now()), text, tone });
    },
    []
  );

  const dismissToast = useCallback(() => setToast(null), []);

  const commit = useCallback(
    <T,>(result: ActionResult<T>): ActionResult<T> => {
      if (!result.ok) {
        return result;
      }
      const saved = saveDatabaseToStorage(result.data);
      if (!saved.ok) {
        setStorageError(saved.error ?? 'Failed to save changes.');
      } else {
        setStorageError(null);
      }
      setDb(result.data);
      return result;
    },
    []
  );

  const createTrip = useCallback(
    (name: string, initialMembers: string[] = []) =>
      commit(createTripOp(db, name, initialMembers)),
    [db, commit]
  );

  const renameTrip = useCallback(
    (tripId: string, newName: string) => commit(renameTripOp(db, tripId, newName)),
    [db, commit]
  );

  const setTripStatus = useCallback(
    (tripId: string, status: TripStatus) => commit(setTripStatusOp(db, tripId, status)),
    [db, commit]
  );

  const deleteTrip = useCallback(
    (tripId: string) => commit(deleteTripOp(db, tripId)),
    [db, commit]
  );

  const addMember = useCallback(
    (tripId: string, name: string) => commit(addMemberOp(db, tripId, name)),
    [db, commit]
  );

  const removeMember = useCallback(
    (memberId: string) => commit(removeMemberOp(db, memberId)),
    [db, commit]
  );

  const addExpense = useCallback(
    (input: ExpenseInput) => commit(addExpenseOp(db, input)),
    [db, commit]
  );

  const updateExpense = useCallback(
    (expenseId: string, input: ExpenseInput) =>
      commit(updateExpenseOp(db, expenseId, input)),
    [db, commit]
  );

  const deleteExpense = useCallback(
    (expenseId: string) => commit(deleteExpenseOp(db, expenseId)),
    [db, commit]
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <TripContext.Provider
      value={{
        db,
        theme,
        storageError,
        toast,
        toggleTheme,
        showToast,
        dismissToast,
        createTrip,
        renameTrip,
        setTripStatus,
        deleteTrip,
        addMember,
        removeMember,
        addExpense,
        updateExpense,
        deleteExpense,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export function useTripStore(): TripContextValue {
  const ctx = useContext(TripContext);
  if (!ctx) {
    throw new Error('useTripStore must be used inside TripProvider');
  }
  return ctx;
}
