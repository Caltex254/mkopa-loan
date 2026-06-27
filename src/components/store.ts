'use client';

import { create } from 'zustand';

export type View =
  | 'splash'
  | 'landing'
  | 'login'
  | 'register'
  | 'kyc'
  | 'loan-apply'
  | 'loan-confirmation'
  | 'loan-payment'
  | 'loan-success'
  | 'dashboard'
  | 'admin-dashboard';

interface User {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  role: string;
  kycStatus?: string;
  loanLimit?: number;
}

interface LoanApplication {
  id: string;
  loanAmount: number;
  processingFee: number;
  amountReceived: number;
  totalRepayment: number;
  repaymentDate: string;
  status: string;
  activationPaid: boolean;
  activationRef?: string;
  paymentRef?: string;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface AppState {
  view: View;
  setView: (view: View) => void;
  user: User | null;
  setUser: (user: User | null) => void;
  loanApplication: LoanApplication | null;
  setLoanApplication: (app: LoanApplication | null) => void;
  notifications: Notification[];
  setNotifications: (n: Notification[]) => void;
  logout: () => void;
}

// ───────────────────────────────────────────────────────────────────────────
// LOGIN PERSISTENCE: Cache user in localStorage so that closing/reopening the
// browser doesn't lose the session. The HTTP-only cookie `mkopa-token` (30-day
// expiry, set by /api/auth/login) is what actually authenticates API calls —
// but the in-memory React state is wiped on every page reload.
//
// IMPORTANT: We do NOT read localStorage in the Zustand initializer, because
// that would cause a server/client hydration mismatch (the server renders
// with `user: null` while the client immediately has the cached user, which
// React flags as a hydration error and crashes the page).
//
// Instead, the store starts with `user: null` on both server and client.
// The page component calls `hydrateCachedUser()` from a useEffect (which
// only runs after hydration on the client) to load any cached user into
// the store.
// ───────────────────────────────────────────────────────────────────────────
const USER_CACHE_KEY = 'mkopa-cached-user';

function loadCachedUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && parsed.id && parsed.email) {
      return parsed as User;
    }
    return null;
  } catch {
    return null;
  }
}

function persistUser(user: User | null) {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      window.localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_CACHE_KEY);
    }
  } catch {
    // localStorage might be unavailable (private mode, etc.) — silently ignore
  }
}

export const useAppStore = create<AppState>((set) => ({
  // ALWAYS start with null on both server and client to avoid hydration mismatch.
  // Hydration from localStorage happens later via `hydrateCachedUser()` in a useEffect.
  user: null,
  view: 'splash',
  setView: (view) => set({ view }),
  setUser: (user) => {
    persistUser(user);
    set({ user });
  },
  loanApplication: null,
  setLoanApplication: (app) => set({ loanApplication: app }),
  notifications: [],
  setNotifications: (n) => set({ notifications: n }),
  logout: () => {
    persistUser(null);
    set({ user: null, view: 'landing', loanApplication: null, notifications: [] });
    fetch('/api/auth/logout', { method: 'POST' });
  },
}));

// ───────────────────────────────────────────────────────────────────────────
// Client-only hydration helper. Call this from a useEffect in the page
// component to load any cached user AFTER React has finished hydrating the
// server-rendered HTML. This avoids the server/client state mismatch that
// causes "client-side exception" errors.
// ───────────────────────────────────────────────────────────────────────────
export function hydrateCachedUser() {
  if (typeof window === 'undefined') return;
  const cached = loadCachedUser();
  if (cached) {
    // Only set if we don't already have a user (don't overwrite fresh data)
    const current = useAppStore.getState().user;
    if (!current) {
      useAppStore.getState().setUser(cached);
    }
  }
}

// Helper for the page-level auth check to clear stale cache if the server
// says the token is no longer valid.
export function clearCachedUser() {
  persistUser(null);
}
