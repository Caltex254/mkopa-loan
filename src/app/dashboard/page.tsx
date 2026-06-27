// /dashboard — direct URL entry point for the user dashboard.

'use client';

import UserDashboard from '@/components/user-dashboard';

export default function DashboardPage() {
  return (
    <main className="min-h-screen">
      <UserDashboard />
    </main>
  );
}
