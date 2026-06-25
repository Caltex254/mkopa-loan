// /register — direct URL entry point for the registration screen.

'use client';

import Register from '@/components/auth/register';

export default function RegisterPage() {
  return (
    <main className="min-h-screen">
      <Register />
    </main>
  );
}
