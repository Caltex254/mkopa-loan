'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/components/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Loader2, LogIn, Shield } from 'lucide-react';

export default function LoginForm() {
  const { setView, setUser, setNotifications } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed. Please try again.');
        return;
      }

      // Set user in store and navigate based on role
      setUser(data.user);
      setView(data.user.role === 'admin' ? 'admin-dashboard' : 'dashboard');

      // Fetch notifications
      try {
        const notifRes = await fetch('/api/notifications');
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          setNotifications(notifData.notifications || []);
        }
      } catch {
        // Notifications fetch failure is non-critical
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-white border-2 border-[#00A651]/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-mkopa.png"
              alt="MKOPA"
              className="h-full w-full object-cover"
            />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-[#333333]">
            MKOPA LOAN
          </CardTitle>
          <CardDescription className="text-sm text-gray-500">
            Sign in to access your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="login-email">Email Address</Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full bg-[#00A651] text-white hover:bg-[#008f45] font-semibold text-base"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Login
                </>
              )}
            </Button>

            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="font-semibold text-[#00A651] hover:text-[#008f45] underline-offset-2 hover:underline transition-colors"
                onClick={() => setView('register')}
                disabled={loading}
              >
                Register
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
