// /login — direct URL entry point for the login screen.
// The existing app is a single-page app driven by a Zustand store; this route
// simply sets the store's view to 'login' and renders the same root component
// used by '/', so users can deep-link /login and get the login screen without
// going through the splash + landing flow.

'use client';

import Login from '@/components/auth/login';

export default function LoginPage() {
  return (
    <main className="min-h-screen">
      <Login />
    </main>
  );
}
