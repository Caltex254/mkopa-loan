import { NextResponse } from 'next/server';
import { LOAN_PRODUCTS } from '@/lib/loans';

export async function GET() {
  // LOAN_PRODUCTS is a static constant — cache aggressively at the browser
  // and at the CDN edge so this endpoint never hits the DB or the server.
  return NextResponse.json({ products: LOAN_PRODUCTS }, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
