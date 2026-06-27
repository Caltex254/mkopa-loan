// /kyc — direct URL entry point for the KYC upload form.

'use client';

import KYC from '@/components/kyc';

export default function KycPage() {
  return (
    <main className="min-h-screen">
      <KYC />
    </main>
  );
}
