// /admin/kyc — direct URL entry point for the admin KYC review screen.
// The AdminDashboard component already includes the KYC review section as one
// of its tabs, so we simply render the dashboard here. Auth is enforced by
// src/middleware.ts (NextAuth withAuth) — unauthenticated visitors are
// redirected to /login.

'use client';

import AdminDashboard from '@/components/admin-dashboard';

export default function AdminKycPage() {
  return (
    <main className="min-h-screen">
      <AdminDashboard />
    </main>
  );
}
