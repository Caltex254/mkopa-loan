// /apply — direct URL entry point for the loan application form.

'use client';

import LoanApplication from '@/components/loan-application';

export default function ApplyPage() {
  return (
    <main className="min-h-screen">
      <LoanApplication />
    </main>
  );
}
