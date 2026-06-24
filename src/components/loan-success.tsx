'use client';

/* Loan Success Component */
import { useAppStore } from '@/components/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Home,
  PlusCircle,
  Receipt,
  Hash,
  Banknote,
  Clock,
  ArrowLeft,
} from 'lucide-react';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

export default function LoanSuccess() {
  const { setView, loanApplication } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-md mx-auto">
        {/* Back Button */}
        <button
          onClick={() => setView('dashboard')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#00A651] transition-colors cursor-pointer mb-4"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </button>

      <Card className="w-full">
        <CardContent className="pt-8 space-y-6">
          {/* Animated Checkmark */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#00A651] flex items-center justify-center animate-[scaleIn_0.5s_ease-out]">
                <CheckCircle2 className="size-10 text-white" />
              </div>
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-[#00A651]/20 animate-[ping_1.5s_ease-out_infinite]" />
            </div>
          </div>

          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-[#333333]">
              Application Submitted Successfully!
            </h1>
            <p className="text-gray-600 text-sm">
              We will review your application and notify you of the decision within 24 hours.
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-gray-50 rounded-xl p-5 space-y-3 border">
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Receipt className="size-4 text-[#00A651]" />
              <span>Payment Reference</span>
            </div>
            <p className="font-mono font-semibold text-[#333333] text-sm">
              {loanApplication?.paymentRef || 'N/A'}
            </p>

            <Separator />

            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Hash className="size-4 text-[#00A651]" />
              <span>Application ID</span>
            </div>
            <p className="font-mono font-semibold text-[#333333] text-sm">
              {loanApplication?.id || 'N/A'}
            </p>

            <Separator />

            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Banknote className="size-4 text-[#00A651]" />
              <span>Loan Amount</span>
            </div>
            <p className="font-semibold text-[#333333]">
              {loanApplication ? formatCurrency(loanApplication.loanAmount) : 'N/A'}
            </p>

            <Separator />

            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Clock className="size-4 text-[#00A651]" />
              <span>Status</span>
            </div>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
              Submitted for Review
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => setView('dashboard')}
              className="w-full h-11 bg-[#00A651] hover:bg-[#008f45] text-white font-medium"
            >
              <Home className="size-4 mr-2" />
              Go to Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => setView('loan-apply')}
              className="w-full text-[#00A651] hover:text-[#008f45] hover:bg-[#00A651]/5"
            >
              <PlusCircle className="size-4 mr-2" />
              Apply for Another Loan
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>

      {/* Inline keyframes for animation */}
      <style jsx>{`
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
