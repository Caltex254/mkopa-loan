// Loan product definitions
// Activation fee follows a STRICT PROPORTIONAL FORMULA based on the anchor point:
//   KES 5,000 loan → KES 299 activation fee
//   => rate = 299 / 5000 = 0.0598
//   => fee = ceil(loanAmount × 0.0598)
// Every loan tier below is generated from this same formula so the displayed fee
// always matches what the backend charges via calculateActivationFee().
const ACTIVATION_FEE_RATE = 299 / 5000; // 0.0598

function proportionalActivationFee(loanAmount: number): number {
  if (!loanAmount || loanAmount <= 0) return 0;
  return Math.ceil(loanAmount * ACTIVATION_FEE_RATE);
}

// Pre-computed tiers for display purposes (the formula is the source of truth).
export const LOAN_PRODUCTS = [
  { amount: 5000, processingFee: 299, activationFee: proportionalActivationFee(5000) },
  { amount: 10000, processingFee: 599, activationFee: proportionalActivationFee(10000) },
  { amount: 20000, processingFee: 1199, activationFee: proportionalActivationFee(20000) },
  { amount: 50000, processingFee: 2999, activationFee: proportionalActivationFee(50000) },
  { amount: 100000, processingFee: 5999, activationFee: proportionalActivationFee(100000) },
  { amount: 200000, processingFee: 11999, activationFee: proportionalActivationFee(200000) },
  { amount: 500000, processingFee: 29999, activationFee: proportionalActivationFee(500000) },
];

// Interest rate (simple) for repayment calculation
const INTEREST_RATE = 0.15; // 15%
const LOAN_TERM_DAYS = 30;
const MIN_LOAN_AMOUNT = 5000;
const MAX_LOAN_AMOUNT = 500000;

/**
 * Calculate activation fee for ANY loan amount using the strict proportional formula:
 *   fee = ceil(loanAmount × 0.0598)
 * Anchor: KES 5,000 → KES 299.
 * This guarantees that whatever amount the customer picks, the displayed fee and
 * the backend-charged fee are computed from the SAME formula — no interpolation,
 * no lookup table mismatches.
 */
export function calculateActivationFee(loanAmount: number): number {
  return proportionalActivationFee(loanAmount);
}

// Backwards-compatible alias kept for older imports
export const ACTIVATION_FEE = 299;

/**
 * Calculate processing fee for any loan amount.
 * For predefined products, use the exact fee.
 * For custom amounts, calculate based on a ~6% rate with interpolation.
 */
export function calculateProcessingFee(loanAmount: number): number {
  // Check if it matches a predefined product exactly
  const exactProduct = LOAN_PRODUCTS.find((p) => p.amount === loanAmount);
  if (exactProduct) return exactProduct.processingFee;

  // For custom amounts, use interpolation between the nearest products
  // Find the two closest predefined products
  const sorted = [...LOAN_PRODUCTS].sort((a, b) => a.amount - b.amount);

  // If below minimum product, use the minimum fee ratio
  if (loanAmount <= sorted[0].amount) {
    return sorted[0].processingFee;
  }

  // If above maximum product, use the maximum fee ratio
  if (loanAmount >= sorted[sorted.length - 1].amount) {
    return Math.ceil(loanAmount * 0.06);
  }

  // Find bracket
  let lower = sorted[0];
  let upper = sorted[sorted.length - 1];

  for (let i = 0; i < sorted.length - 1; i++) {
    if (loanAmount >= sorted[i].amount && loanAmount <= sorted[i + 1].amount) {
      lower = sorted[i];
      upper = sorted[i + 1];
      break;
    }
  }

  // Linear interpolation
  const ratio =
    (loanAmount - lower.amount) / (upper.amount - lower.amount);
  const fee =
    lower.processingFee + ratio * (upper.processingFee - lower.processingFee);

  return Math.ceil(fee);
}

/**
 * Calculate full loan details for any amount >= MIN_LOAN_AMOUNT
 */
export function calculateLoan(loanAmount: number) {
  if (loanAmount < MIN_LOAN_AMOUNT) return null;
  if (loanAmount > MAX_LOAN_AMOUNT) return null;

  const processingFee = calculateProcessingFee(loanAmount);
  const activationFee = calculateActivationFee(loanAmount);
  const amountReceived = loanAmount - processingFee;
  const interest = loanAmount * INTEREST_RATE;
  const totalRepayment = loanAmount + interest;

  const repaymentDate = new Date();
  repaymentDate.setDate(repaymentDate.getDate() + LOAN_TERM_DAYS);

  return {
    loanAmount,
    processingFee,
    activationFee,
    amountReceived,
    totalRepayment,
    repaymentDate: repaymentDate.toISOString().split('T')[0],
    interestRate: INTEREST_RATE * 100,
    loanTermDays: LOAN_TERM_DAYS,
  };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export { MIN_LOAN_AMOUNT, MAX_LOAN_AMOUNT, INTEREST_RATE, LOAN_TERM_DAYS };
