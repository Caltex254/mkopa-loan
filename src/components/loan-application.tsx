'use client';

/* Loan Application Component with Custom Amount Editor + STK Push Payment */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppStore } from '@/components/store';
import {
  LOAN_PRODUCTS,
  calculateLoan,
  calculateProcessingFee,
  calculateActivationFee,
  formatCurrency,
  MIN_LOAN_AMOUNT,
  MAX_LOAN_AMOUNT,
} from '@/lib/loans';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Banknote,
  ChevronRight,
  ChevronLeft,
  FileText,
  CheckCircle2,
  Phone,
  Shield,
  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
  Pencil,
  Sparkles,
  Smartphone,
  Signal,
  X,
  ExternalLink,
} from 'lucide-react';

const INTEREST_RATE = 0.15;

function getRepaymentDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
}

type GatewayType = 'safaricom' | 'airtel' | 'auto';
type PaymentFlow = 'idle' | 'processing' | 'stk_push' | 'redirect' | 'completed' | 'failed';

export default function LoanApplication() {
  const { setView, user, loanApplication, setLoanApplication } = useAppStore();
  const [step, setStep] = useState(1);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('5000');
  const [customSliderValue, setCustomSliderValue] = useState([5000]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');
  const [payingFee, setPayingFee] = useState(false);
  const [feeError, setFeeError] = useState('');
  const [gateway, setGateway] = useState<GatewayType>('auto');
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow>('idle');
  const [pollCount, setPollCount] = useState(0);
  const [paymentIframeUrl, setPaymentIframeUrl] = useState<string | null>(null);
  const [networkProvider, setNetworkProvider] = useState<string>('');

  // Calculate loan details based on selected or custom amount
  const effectiveAmount = isCustomMode
    ? Math.max(MIN_LOAN_AMOUNT, Math.min(MAX_LOAN_AMOUNT, parseInt(customAmount) || MIN_LOAN_AMOUNT))
    : selectedAmount;

  const loanDetails = useMemo(() => {
    if (!effectiveAmount || effectiveAmount < MIN_LOAN_AMOUNT) return null;
    return calculateLoan(effectiveAmount);
  }, [effectiveAmount]);

  // Activation fee scales with the selected loan amount
  const activationFee = useMemo(() => {
    if (!effectiveAmount || effectiveAmount < MIN_LOAN_AMOUNT) return 0;
    return calculateActivationFee(effectiveAmount);
  }, [effectiveAmount]);

  // User cannot exceed the admin-set loan limit (if any)
  const userLoanLimit = user?.loanLimit && user.loanLimit > 0 ? user.loanLimit : MAX_LOAN_AMOUNT;
  const effectiveMaxAmount = Math.min(MAX_LOAN_AMOUNT, userLoanLimit);

  const customProcessingFee = useMemo(() => {
    if (!isCustomMode) return 0;
    const amt = parseInt(customAmount) || MIN_LOAN_AMOUNT;
    if (amt < MIN_LOAN_AMOUNT) return 0;
    return calculateProcessingFee(amt);
  }, [isCustomMode, customAmount]);

  const customActivationFee = useMemo(() => {
    if (!isCustomMode) return 0;
    const amt = parseInt(customAmount) || MIN_LOAN_AMOUNT;
    if (amt < MIN_LOAN_AMOUNT) return 0;
    return calculateActivationFee(amt);
  }, [isCustomMode, customAmount]);

  const handleCustomAmountChange = (value: string) => {
    const num = parseInt(value.replace(/[^0-9]/g, ''));
    if (!isNaN(num)) {
      if (num > MAX_LOAN_AMOUNT) return;
      setCustomAmount(String(num));
      setCustomSliderValue([num]);
    } else if (value === '') {
      setCustomAmount('');
      setCustomSliderValue([MIN_LOAN_AMOUNT]);
    }
  };

  const handleCustomSliderChange = (val: number[]) => {
    const v = val[0];
    setCustomSliderValue(val);
    setCustomAmount(String(v));
  };

  const handleStep1Continue = async () => {
    const amountToUse = isCustomMode
      ? Math.max(MIN_LOAN_AMOUNT, parseInt(customAmount) || MIN_LOAN_AMOUNT)
      : selectedAmount;

    if (!amountToUse || amountToUse < MIN_LOAN_AMOUNT) {
      setError('Please select or enter a loan amount (minimum KES 5,000)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/loans/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanAmount: amountToUse }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to submit loan application');
        return;
      }

      setLoanApplication({
        id: data.application.id,
        loanAmount: data.application.loanAmount,
        processingFee: data.application.processingFee,
        amountReceived: data.application.amountReceived,
        totalRepayment: data.application.totalRepayment,
        repaymentDate: data.application.repaymentDate,
        status: data.application.status,
        activationPaid: data.application.activationPaid,
        activationRef: data.application.activationRef || undefined,
        paymentRef: data.application.paymentRef || undefined,
        createdAt: data.application.createdAt,
      });

      setStep(2);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Poll for payment status
  const pollPaymentStatus = useCallback(async (ref: string) => {
    try {
      const res = await fetch(`/api/payments/status?reference=${encodeURIComponent(ref)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.payment) {
          if (data.payment.status === 'completed') {
            setPaymentFlow('completed');
            // Update loan application in store
            if (data.application && loanApplication) {
              setLoanApplication({
                ...loanApplication,
                status: data.application.status,
                activationPaid: data.application.activationPaid,
                activationRef: data.application.activationRef,
                paymentRef: data.application.paymentRef,
              });
            }
            setTimeout(() => setView('loan-success'), 1500);
            return true;
          } else if (data.payment.status === 'failed') {
            setPaymentFlow('failed');
            setFeeError('Payment failed. Please try again.');
            return true;
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }, [loanApplication, setLoanApplication, setView]);

  useEffect(() => {
    if ((paymentFlow !== 'stk_push' && paymentFlow !== 'redirect') || !paymentReference) return;
    if (pollCount >= 30) {
      setPaymentFlow('failed');
      setFeeError('Payment verification timed out. If you completed payment, please check your loan status or contact support.');
      return;
    }

    const timer = setTimeout(async () => {
      const done = await pollPaymentStatus(paymentReference);
      if (!done) {
        setPollCount(prev => prev + 1);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [paymentFlow, paymentReference, pollCount, pollPaymentStatus]);

  const handlePayActivation = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setFeeError('Please enter a valid phone number (e.g., 0712345678 or 254712345678)');
      return;
    }
    if (!loanApplication) {
      setFeeError('Application not found');
      return;
    }

    setPayingFee(true);
    setFeeError('');
    setPaymentFlow('processing');
    setPaymentIframeUrl(null);

    try {
      const res = await fetch('/api/payments/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: loanApplication.id,
          phoneNumber,
          gateway: gateway === 'auto' ? undefined : gateway,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeeError(data.error || 'Payment failed');
        setPaymentFlow('idle');
        return;
      }

      // Payment initiated successfully
      if (data.xdigitex?.reference) {
        setPaymentReference(data.xdigitex.reference);
        setNetworkProvider(data.networkProvider || '');

        // Use embed_url which combines redirect_url (Pesapal) or checkout_url (pawapay/mobile)
        const embedUrl = data.xdigitex.embed_url || data.xdigitex.redirect_url || data.xdigitex.checkout_url;

        if (embedUrl) {
          // Redirect/iframe flow - embed payment page within the app
          setPaymentIframeUrl(embedUrl);
          setPaymentFlow('redirect');
          setPollCount(0);
        } else {
          // STK Push flow - prompt user to check phone
          setPaymentFlow('stk_push');
          setPollCount(0);
        }
      } else {
        // Fallback: no reference returned
        setPaymentFlow('idle');
        setFeeError('Payment initiated but no reference returned. Please try again.');
      }
    } catch {
      setFeeError('Network error. Please try again.');
      setPaymentFlow('idle');
    } finally {
      setPayingFee(false);
    }
  };

  // Reset payment state
  const resetPayment = () => {
    setPaymentFlow('idle');
    setPaymentIframeUrl(null);
    setFeeError('');
    setPaymentReference(null);
    setPollCount(0);
    setNetworkProvider('');
  };

  const steps = [
    { number: 1, label: 'Select Amount' },
    { number: 2, label: 'Review Details' },
    { number: 3, label: 'Confirm & Pay' },
  ];

  const getGatewayLabel = (g: GatewayType) => {
    switch (g) {
      case 'safaricom': return 'Safaricom M-Pesa';
      case 'airtel': return 'Airtel Money';
      case 'auto': return 'Auto-Detect';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => setView('dashboard')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#00A651] transition-colors cursor-pointer"
        >
          <ChevronLeft className="size-4" />
          Back to Dashboard
        </button>

        {/* Stepper */}
        <div className="flex items-center justify-center">
          {steps.map((s, i) => (
            <div key={s.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                    step >= s.number
                      ? 'bg-[#00A651] text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step > s.number ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    s.number
                  )}
                </div>
                <span
                  className={`text-[10px] sm:text-xs mt-1 font-medium ${
                    step >= s.number ? 'text-[#00A651]' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-10 sm:w-16 h-0.5 mx-1 mb-5 transition-colors ${
                    step > s.number ? 'bg-[#00A651]' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Loan Amount */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-[#333333]">
                <Banknote className="size-5 text-[#00A651]" />
                Select Loan Amount
              </CardTitle>
              <CardDescription>
                Choose a preset amount or enter your own custom amount (minimum KES 5,000)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Mode Toggle */}
              <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => { setIsCustomMode(false); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                    !isCustomMode
                      ? 'bg-[#00A651] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Sparkles className="size-4" />
                  Preset Amounts
                </button>
                <button
                  onClick={() => { setIsCustomMode(true); setError(''); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                    isCustomMode
                      ? 'bg-[#00A651] text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Pencil className="size-4" />
                  Custom Amount
                </button>
              </div>

              {/* Preset Amounts - filtered by user's approved loan limit */}
              {!isCustomMode && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {LOAN_PRODUCTS.filter((p) => p.amount <= effectiveMaxAmount).map((product) => {
                    const isSelected = selectedAmount === product.amount;
                    return (
                      <button
                        key={product.amount}
                        onClick={() => {
                          setSelectedAmount(product.amount);
                          setError('');
                        }}
                        className={`relative p-4 rounded-xl border-2 text-center transition-all hover:shadow-md cursor-pointer ${
                          isSelected
                            ? 'border-[#00A651] bg-[#00A651]/5 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-[#00A651]/40'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#00A651] flex items-center justify-center">
                            <CheckCircle2 className="size-3 text-white" />
                          </div>
                        )}
                        <p className="font-bold text-[#333333] text-sm sm:text-base">
                          {formatCurrency(product.amount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Activation: {formatCurrency(product.activationFee)}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Custom Amount Editor */}
              {isCustomMode && (
                <div className="space-y-5 p-4 rounded-xl bg-[#00A651]/5 border border-[#00A651]/20">
                  <div className="flex items-center gap-2 text-[#00A651]">
                    <Pencil className="size-4" />
                    <span className="font-semibold text-sm">Enter Your Preferred Amount</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="custom-amount" className="text-sm font-medium text-gray-700">
                      Loan Amount (KES)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold text-sm">
                        KES
                      </span>
                      <Input
                        id="custom-amount"
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter amount (min 5,000)"
                        value={customAmount ? Number(customAmount).toLocaleString() : ''}
                        onChange={(e) => {
                          const raw = e.target.value.replace(/,/g, '').replace(/[^0-9]/g, '');
                          handleCustomAmountChange(raw);
                        }}
                        className="pl-12 h-12 text-lg font-bold text-[#333333] border-[#00A651]/30 focus:border-[#00A651]"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatCurrency(MIN_LOAN_AMOUNT)}</span>
                      <span className="text-sm font-bold text-[#00A651]">
                        {formatCurrency(parseInt(customAmount) || MIN_LOAN_AMOUNT)}
                      </span>
                      <span>{formatCurrency(effectiveMaxAmount)}</span>
                    </div>
                    <Slider
                      min={MIN_LOAN_AMOUNT}
                      max={effectiveMaxAmount}
                      step={500}
                      value={[Math.min(parseInt(customAmount) || MIN_LOAN_AMOUNT, effectiveMaxAmount)]}
                      onValueChange={handleCustomSliderChange}
                      className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-[#00A651] [&_[data-slot=slider-thumb]]:border-[#00A651] [&_[data-slot=slider-thumb]]:size-5"
                    />
                    {userLoanLimit < MAX_LOAN_AMOUNT && (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="size-3" />
                        Your approved loan limit is {formatCurrency(userLoanLimit)}. Apply within this limit.
                      </p>
                    )}
                  </div>

                  {parseInt(customAmount) >= MIN_LOAN_AMOUNT && (
                    <div className="space-y-2 rounded-lg bg-white p-4 border border-[#00A651]/10">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Auto-Calculated Breakdown
                      </h4>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Processing Fee</span>
                        <span className="font-semibold text-red-500">-{formatCurrency(customProcessingFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Amount You Receive</span>
                        <span className="font-semibold text-[#00A651]">
                          {formatCurrency((parseInt(customAmount) || MIN_LOAN_AMOUNT) - customProcessingFee)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Interest (15%, 30 days)</span>
                        <span className="font-semibold text-orange-500">
                          +{formatCurrency((parseInt(customAmount) || MIN_LOAN_AMOUNT) * INTEREST_RATE)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Repayment</span>
                        <span className="font-bold text-[#333333]">
                          {formatCurrency((parseInt(customAmount) || MIN_LOAN_AMOUNT) * (1 + INTEREST_RATE))}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Activation Fee</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(customActivationFee)}</span>
                      </div>
                    </div>
                  )}

                  {parseInt(customAmount) < MIN_LOAN_AMOUNT && customAmount !== '' && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="size-3" />
                      Minimum loan amount is {formatCurrency(MIN_LOAN_AMOUNT)}
                    </p>
                  )}
                </div>
              )}

              {(selectedAmount || (isCustomMode && parseInt(customAmount) >= MIN_LOAN_AMOUNT)) && loanDetails && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800 flex items-start gap-2">
                  <Info className="size-4 mt-0.5 shrink-0" />
                  <div>
                    You will receive <strong>{formatCurrency(loanDetails.amountReceived)}</strong> after
                    deducting the processing fee of {formatCurrency(loanDetails.processingFee)}.
                    Activation fee of <strong>{formatCurrency(activationFee)}</strong> required to finalize.
                  </div>
                </div>
              )}

              <Button
                onClick={handleStep1Continue}
                disabled={
                  loading ||
                  (!isCustomMode && !selectedAmount) ||
                  (isCustomMode && (parseInt(customAmount) || 0) < MIN_LOAN_AMOUNT)
                }
                className="w-full h-11 bg-[#00A651] hover:bg-[#008f45] text-white font-medium cursor-pointer"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="size-4 ml-1" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review Loan Details */}
        {step === 2 && loanDetails && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-[#333333]">
                <FileText className="size-5 text-[#00A651]" />
                Review Loan Details
              </CardTitle>
              <CardDescription>
                Please review the details of your loan before confirming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Loan Amount</span>
                  <span className="font-semibold text-[#333333]">{formatCurrency(loanDetails.loanAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Processing Fee</span>
                  <span className="font-semibold text-red-600">-{formatCurrency(loanDetails.processingFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2 bg-green-50 -mx-6 px-6">
                  <span className="text-green-800 font-medium text-sm">Amount You Will Receive</span>
                  <span className="font-bold text-[#00A651] text-lg">{formatCurrency(loanDetails.amountReceived)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Interest Rate</span>
                  <span className="font-semibold text-[#333333]">15%</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Total Repayment</span>
                  <span className="font-semibold text-[#333333]">{formatCurrency(loanDetails.totalRepayment)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Repayment Date</span>
                  <span className="font-semibold text-[#333333]">{getRepaymentDate()}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2 bg-blue-50 -mx-6 px-6 rounded">
                  <span className="text-blue-800 font-medium text-sm">Activation Fee (Due Now)</span>
                  <span className="font-bold text-blue-700">{formatCurrency(loanDetails.activationFee)}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 h-11 cursor-pointer"
                >
                  <ChevronLeft className="size-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="flex-1 h-11 bg-[#00A651] hover:bg-[#008f45] text-white font-medium cursor-pointer"
                >
                  Confirm & Continue
                  <ChevronRight className="size-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Application Confirmation with Payment */}
        {step === 3 && loanDetails && loanApplication && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl text-[#333333]">
                <Shield className="size-5 text-[#00A651]" />
                Confirm Your Loan Application
              </CardTitle>
              <CardDescription>
                Review your application details and pay the activation fee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Application Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Applicant Name</span>
                  <span className="font-semibold text-[#333333]">{user?.fullName || 'N/A'}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Loan Amount</span>
                  <span className="font-semibold text-[#333333]">{formatCurrency(loanDetails.loanAmount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Processing Fee</span>
                  <span className="font-semibold text-[#333333]">{formatCurrency(loanDetails.processingFee)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Net Amount to Receive</span>
                  <span className="font-semibold text-[#00A651]">{formatCurrency(loanDetails.amountReceived)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Repayment Terms</span>
                  <span className="font-semibold text-[#333333]">{formatCurrency(loanDetails.totalRepayment)} in 30 days</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 text-sm">Application Status</span>
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                    Pending Activation Fee
                  </Badge>
                </div>
              </div>

              <Separator className="my-2" />

              {/* Payment Section */}
              <div className="rounded-xl border-2 border-[#00A651]/20 bg-[#00A651]/5 p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#00A651] flex items-center justify-center shrink-0">
                    <Banknote className="size-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#333333]">Activation Fee Payment</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      To finalize your application, an activation fee of{' '}
                      <strong className="text-[#00A651]">{formatCurrency(loanDetails.activationFee)}</strong> is required.
                      Supports both Safaricom M-Pesa and Airtel Money.
                    </p>
                  </div>
                </div>

                {feeError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="size-4 shrink-0" />
                    {feeError}
                  </div>
                )}

                {/* STK Push - Waiting for phone PIN */}
                {paymentFlow === 'stk_push' && (
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Smartphone className="size-5 text-blue-600 animate-pulse" />
                      </div>
                      <div>
                        <p className="font-semibold text-blue-800">
                          Check Your Phone!
                        </p>
                        <p className="text-sm text-blue-600">
                          {networkProvider === 'Safaricom M-Pesa'
                            ? 'An M-Pesa STK Push has been sent to '
                            : networkProvider === 'Airtel Money'
                              ? 'An Airtel Money push has been sent to '
                              : 'A payment prompt has been sent to '}
                          <strong>{phoneNumber}</strong>. Enter your PIN to complete payment.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 text-blue-500 animate-spin" />
                      <span className="text-xs text-blue-600">
                        Waiting for payment confirmation... (Attempt {pollCount + 1}/30)
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetPayment}
                      className="text-gray-500 border-gray-300"
                    >
                      Cancel & Retry
                    </Button>
                  </div>
                )}

                {/* Redirect/Iframe Payment - Popup modal overlay (does NOT fill the page) */}
                {paymentFlow === 'redirect' && paymentIframeUrl && (
                  <>
                  {/* Tiny inline status pill so the user knows polling is active */}
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <Loader2 className="size-4 text-blue-600 animate-spin" />
                      <span className="text-sm text-blue-700 font-medium">
                        Complete payment in the popup window... (Checking: {pollCount + 1}/30)
                      </span>
                    </div>
                  </div>

                  {/* POPUP MODAL OVERLAY — fixed, centered, with backdrop.
                      Does NOT take over the full page; user can still see the loan
                      application form behind it. Modal is dismissible via Close / X. */}
                  <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Secure payment popup"
                    onClick={(e) => {
                      // Click on backdrop (not on the modal content) closes the popup
                      if (e.target === e.currentTarget) resetPayment();
                    }}
                  >
                    <div
                      className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease-out]"
                      style={{ maxHeight: '90vh' }}
                    >
                      {/* Header bar with brand + close button */}
                      <div className="flex items-center justify-between bg-[#00A651] px-3 py-2.5 shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <Shield className="size-4 text-white shrink-0" />
                          <span className="text-xs font-medium text-white truncate">
                            {networkProvider || 'Secure Payment'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/logos/pesapal-logo.png"
                            alt="Pesapal"
                            className="h-5 w-auto object-contain bg-white rounded px-1"
                          />
                          <button
                            onClick={resetPayment}
                            className="flex items-center justify-center size-6 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                            aria-label="Close payment popup"
                            title="Close"
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Compact status strip */}
                      <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center gap-2 shrink-0">
                        <Loader2 className="size-3 text-blue-600 animate-spin" />
                        <span className="text-[11px] text-blue-700 font-medium truncate">
                          Awaiting payment confirmation... ({pollCount + 1}/30)
                        </span>
                      </div>

                      {/* Iframe — sized for a popup, not full page */}
                      <iframe
                        src={paymentIframeUrl}
                        className="w-full border-0 block"
                        style={{ height: '480px', minHeight: '420px' }}
                        title="Complete Payment"
                        allow="payment"
                      />
                    </div>
                  </div>
                  </>
                )}

                {/* Payment Completed */}
                {paymentFlow === 'completed' && (
                  <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
                    <CheckCircle2 className="size-5 text-green-600" />
                    <div>
                      <p className="font-semibold text-green-800">Payment Successful!</p>
                      <p className="text-sm text-green-600">Redirecting to confirmation...</p>
                    </div>
                  </div>
                )}

                {/* Payment Failed */}
                {paymentFlow === 'failed' && (
                  <div className="p-4 rounded-lg bg-red-50 border border-red-200 space-y-2">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="size-5 text-red-600" />
                      <div>
                        <p className="font-semibold text-red-800">Payment Failed</p>
                        <p className="text-sm text-red-600">{feeError}</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetPayment}
                      className="text-[#00A651] border-[#00A651] hover:bg-[#00A651]/10"
                    >
                      Try Again
                    </Button>
                  </div>
                )}

                {/* Payment Form - Only show when idle */}
                {paymentFlow === 'idle' && (
                <>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2 text-sm">
                    <Phone className="size-4 text-[#00A651]" />
                    Phone Number for Payment
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g. 0712345678 or 254712345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-11"
                    disabled={paymentFlow !== 'idle'}
                  />
                  <p className="text-xs text-gray-500">
                    Enter your M-Pesa or Airtel Money phone number
                  </p>
                </div>

                {/* Gateway Selection - with real official logos */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Signal className="size-4 text-[#00A651]" />
                    Payment Network
                  </Label>
                  <Select
                    value={gateway}
                    onValueChange={(val) => setGateway(val as GatewayType)}
                    disabled={paymentFlow !== 'idle'}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select network" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        <div className="flex items-center gap-2">
                          <Signal className="size-4 text-gray-500" />
                          <span>Auto-Detect (Recommended)</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="safaricom">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/logos/mpesa-logo.png"
                            alt="M-Pesa"
                            className="h-4 w-auto object-contain"
                          />
                          <span>Safaricom M-Pesa</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="airtel">
                        <div className="flex items-center gap-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="/logos/airtel-logo.png"
                            alt="Airtel"
                            className="h-4 w-auto object-contain"
                          />
                          <span>Airtel Money</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {gateway === 'auto'
                      ? 'Network will be auto-detected from your phone number'
                      : `Payment will be processed via ${getGatewayLabel(gateway)}`}
                  </p>
                </div>

                {/* Payment Method Logos Display */}
                <div className="flex items-center justify-center gap-4 py-2 bg-gray-50 rounded-lg">
                  <div className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logos/mpesa-logo.png"
                      alt="M-Pesa"
                      className="h-8 w-auto object-contain"
                    />
                    <span className="text-[10px] text-gray-500">M-Pesa</span>
                  </div>
                  <div className="h-8 w-px bg-gray-300" />
                  <div className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logos/airtel-logo.png"
                      alt="Airtel Money"
                      className="h-8 w-auto object-contain"
                    />
                    <span className="text-[10px] text-gray-500">Airtel</span>
                  </div>
                  <div className="h-8 w-px bg-gray-300" />
                  <div className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logos/visa-mastercard.png"
                      alt="Visa Mastercard"
                      className="h-6 w-auto object-contain"
                    />
                    <span className="text-[10px] text-gray-500">Visa / MC</span>
                  </div>
                </div>

                <Button
                  onClick={handlePayActivation}
                  disabled={payingFee || !phoneNumber || paymentFlow !== 'idle'}
                  className="w-full h-12 bg-[#00A651] hover:bg-[#008f45] text-white font-semibold text-base cursor-pointer"
                >
                  {payingFee ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Initiating Payment...
                    </span>
                  ) : (
                    <>
                      Pay Activation Fee ({formatCurrency(loanDetails.activationFee)})
                      <ArrowRight className="size-4 ml-2" />
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                  <Shield className="size-3" />
                  <span>Powered by</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/pesapal-logo.png"
                    alt="Pesapal"
                    className="h-3 w-auto object-contain"
                  />
                  <span className="text-gray-300">|</span>
                  <span>Secure Payment</span>
                </div>
                </>
                )}
              </div>

              <Button
                variant="ghost"
                onClick={() => { setStep(2); resetPayment(); }}
                className="w-full text-gray-500 cursor-pointer"
                disabled={paymentFlow === 'stk_push' || paymentFlow === 'redirect'}
              >
                <ChevronLeft className="size-4 mr-1" />
                Back to Review
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
