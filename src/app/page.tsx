'use client';

import { useCallback, useEffect } from 'react';
import { useAppStore, hydrateCachedUser, clearCachedUser } from '@/components/store';
import SplashScreen from '@/components/splash-screen';
import Landing from '@/components/landing';
import Login from '@/components/auth/login';
import Register from '@/components/auth/register';
import KYC from '@/components/kyc';
import LoanApplication from '@/components/loan-application';
import LoanSuccess from '@/components/loan-success';
import UserDashboard from '@/components/user-dashboard';
import AdminDashboard from '@/components/admin-dashboard';

export default function Home() {
  const { view, setUser, setView } = useAppStore();

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Hydrate cached user from localStorage AFTER React hydration.
  // This MUST run inside useEffect (not during render) to avoid server/client
  // hydration mismatches that crash the page.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    hydrateCachedUser();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Verify the cached user's token with /api/auth/me.
  // If valid → refresh user data. If invalid → clear cache & bounce to landing.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function verifyAuth() {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            return;
          }
        }
        // Server says we're not authenticated — clear any stale cache.
        const currentState = useAppStore.getState();
        if (currentState.user) {
          clearCachedUser();
          if (
            currentState.view !== 'login' &&
            currentState.view !== 'register' &&
            currentState.view !== 'landing' &&
            currentState.view !== 'splash'
          ) {
            setView('landing');
            setUser(null);
          }
        }
      } catch {
        // Network error — keep the cached user (offline mode).
      }
    }
    verifyAuth();
    return () => {
      cancelled = true;
    };
  }, [setUser, setView]);

  // Handle payment callback redirect (from Pesapal/xdigitex)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    if (paymentStatus === 'completed' || paymentStatus === 'success' || paymentStatus === 'ACCEPTED') {
      window.history.replaceState({}, '', '/');
      setView('loan-success');
    } else if (paymentStatus === 'failed' || paymentStatus === 'rejected') {
      window.history.replaceState({}, '', '/');
    }
  }, [setView]);

  // Splash routes based on whatever is in the store at the moment splash finishes.
  // On first mount, user is null (SSR-safe). The useEffect above hydrates from
  // localStorage within ~1ms of mount, so by the time the 2.5s splash animation
  // completes, the cached user (if any) is already in the store.
  const handleSplashFinished = useCallback(() => {
    const { user } = useAppStore.getState();
    if (user?.role === 'admin') {
      setView('admin-dashboard');
    } else if (user) {
      setView('dashboard');
    } else {
      setView('landing');
    }
  }, [setView]);

  return (
    <main className="min-h-screen">
      {view === 'splash' && <SplashScreen onFinished={handleSplashFinished} minDuration={2500} />}
      {view === 'landing' && <Landing />}
      {view === 'login' && <Login />}
      {view === 'register' && <Register />}
      {view === 'kyc' && <KYC />}
      {view === 'loan-apply' && <LoanApplication />}
      {view === 'loan-success' && <LoanSuccess />}
      {view === 'dashboard' && <UserDashboard />}
      {view === 'admin-dashboard' && <AdminDashboard />}
    </main>
  );
}
