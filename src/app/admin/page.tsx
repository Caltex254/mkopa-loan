// /admin — direct URL entry point for the admin dashboard.
// Auth is enforced by src/middleware.ts (NextAuth withAuth) — unauthenticated
// visitors are redirected to /login.

'use client';

import AdminDashboard from '@/components/admin-dashboard';

export default function AdminPage() {
  return (
    <main className="min-h-screen">
      <AdminDashboard />
    </main>
  );
}
