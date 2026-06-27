'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/components/store';
import { LOAN_PRODUCTS, calculateLoan, formatCurrency } from '@/lib/loans';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import Image from 'next/image';
import {
  Zap,
  Shield,
  CalendarClock,
  Unlock,
  Smartphone,
  Eye,
  Star,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Banknote,
  Calculator,
  CheckCircle2,
  Send,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  ChevronUp,
  DollarSign,
  Clock,
  TrendingUp,
} from 'lucide-react';

// ─── Loan Amount Steps (from LOAN_PRODUCTS) ────────────────────────────────
const LOAN_AMOUNTS = LOAN_PRODUCTS.map((p) => p.amount);
const MIN_LOAN = LOAN_AMOUNTS[0];
const MAX_LOAN = LOAN_AMOUNTS[LOAN_AMOUNTS.length - 1];

function nearestLoanAmount(value: number): number {
  return LOAN_AMOUNTS.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

// ─── Section Wrapper ────────────────────────────────────────────────────────
function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`px-4 py-16 md:px-8 lg:px-16 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

// ─── Section Title ──────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 text-center text-3xl font-bold text-[#333333] md:text-4xl">
      {children}
    </h2>
  );
}

function SectionSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto mb-12 max-w-2xl text-center text-gray-500">
      {children}
    </p>
  );
}

// ─── Star Rating ────────────────────────────────────────────────────────────
function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`size-4 ${
            i < count ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HERO SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function HeroSection() {
  const { setView, user } = useAppStore();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#00A651] via-[#008f45] to-[#006b34]">
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 size-96 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute right-1/4 top-1/3 size-48 rounded-full bg-white/5" />

      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-20 md:flex-row md:px-8 md:py-28 lg:px-16">
        {/* Text Content */}
        <div className="flex-1 text-center md:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <Zap className="size-4" />
            Instant Loan Approval
          </div>
          <h1 className="mb-6 text-4xl font-extrabold leading-tight text-white md:text-5xl lg:text-6xl">
            Get Instant Loans from{' '}
            <span className="underline decoration-4 underline-offset-4 decoration-yellow-300">
              5,000 to 500,000
            </span>
          </h1>
          <p className="mb-8 max-w-lg text-lg text-white/90 md:text-xl">
            Fast approval, secure processing, and flexible repayment options.
            Get the money you need, when you need it.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center md:justify-start">
            <Button
              size="lg"
              className="bg-white text-[#00A651] hover:bg-white/90 font-bold text-base px-8 h-12 shadow-lg cursor-pointer"
              onClick={() => setView(user ? 'loan-apply' : 'register')}
            >
              Apply Now
              <ArrowRight className="ml-1 size-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/40 text-white hover:bg-white/10 bg-transparent font-semibold text-base px-8 h-12 cursor-pointer"
              onClick={() => {
                document
                  .getElementById('calculator')
                  ?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Calculator className="mr-1 size-5" />
              Calculate Loan
            </Button>
          </div>

          {/* Trust indicators */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-white/80 md:justify-start">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-yellow-300" />
              <span className="text-sm">Bank-level Security</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-yellow-300" />
              <span className="text-sm">5-min Approval</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-yellow-300" />
              <span className="text-sm">No Hidden Fees</span>
            </div>
          </div>
        </div>

        {/* Illustration */}
        <div className="flex flex-1 items-center justify-center">
          <div className="relative">
            {/* Main card illustration */}
            <div className="rounded-2xl bg-white/10 p-8 backdrop-blur-md border border-white/20">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-20 items-center justify-center rounded-full bg-white/20">
                  <Banknote className="size-10 text-white" />
                </div>
                <div className="text-3xl font-bold text-white">KES 500,000</div>
                <div className="text-white/80">Maximum Loan Amount</div>
                <div className="w-full border-t border-white/20 pt-4">
                  <div className="flex justify-between text-sm text-white/70">
                    <span>Interest Rate</span>
                    <span className="font-semibold text-white">15%</span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-white/70">
                    <span>Loan Term</span>
                    <span className="font-semibold text-white">30 Days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -left-6 -top-4 flex items-center gap-1 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-[#333333] shadow-lg">
              <TrendingUp className="size-3" />
              Fast
            </div>
            <div className="absolute -bottom-3 -right-3 flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-bold text-[#00A651] shadow-lg">
              <CheckCircle2 className="size-3" />
              Approved
            </div>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 60L48 54C96 48 192 36 288 30C384 24 480 24 576 28C672 32 768 40 864 42C960 44 1056 40 1152 36C1248 32 1344 28 1392 26L1440 24V60H0Z"
            fill="white"
          />
        </svg>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOAN CALCULATOR SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function LoanCalculatorSection() {
  const [sliderValue, setSliderValue] = useState([LOAN_AMOUNTS[2]]); // default 20,000
  const loanAmount = nearestLoanAmount(sliderValue[0]);

  const loanDetails = useMemo(() => {
    return calculateLoan(loanAmount);
  }, [loanAmount]);

  const repaymentDateFormatted = useMemo(() => {
    if (!loanDetails) return '';
    const d = new Date(loanDetails.repaymentDate);
    return d.toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [loanDetails]);

  if (!loanDetails) return null;

  return (
    <Section id="calculator" className="bg-gray-50">
      <SectionTitle>Loan Calculator</SectionTitle>
      <SectionSubtitle>
        See exactly what you&apos;ll pay before you apply. No surprises.
      </SectionSubtitle>

      <div className="mx-auto max-w-2xl">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[#00A651]">
              <Calculator className="size-5" />
              Calculate Your Loan
            </CardTitle>
            <CardDescription>
              Drag the slider to select your desired loan amount
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  {formatCurrency(MIN_LOAN)}
                </span>
                <span className="text-2xl font-bold text-[#00A651]">
                  {formatCurrency(loanAmount)}
                </span>
                <span className="text-sm font-medium text-gray-500">
                  {formatCurrency(MAX_LOAN)}
                </span>
              </div>
              <Slider
                min={MIN_LOAN}
                max={MAX_LOAN}
                step={1000}
                value={[loanAmount]}
                onValueChange={(val) => setSliderValue(val)}
                className="[&_[data-slot=slider-track]]:h-2 [&_[data-slot=slider-range]]:bg-[#00A651] [&_[data-slot=slider-thumb]]:border-[#00A651] [&_[data-slot=slider-thumb]]:size-5"
              />

              {/* Quick amount buttons */}
              <div className="flex flex-wrap gap-2">
                {LOAN_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setSliderValue([amt])}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      loanAmount === amt
                        ? 'bg-[#00A651] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {formatCurrency(amt)}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="space-y-3 rounded-xl bg-gray-50 p-5">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Loan Amount</span>
                <span className="font-semibold text-[#333333]">
                  {formatCurrency(loanDetails.loanAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Processing Fee</span>
                <span className="font-semibold text-red-500">
                  - {formatCurrency(loanDetails.processingFee)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">
                    Amount You Receive
                  </span>
                  <span className="text-lg font-bold text-[#00A651]">
                    {formatCurrency(loanDetails.amountReceived)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">
                  Interest (15%, 30 days)
                </span>
                <span className="font-semibold text-orange-500">
                  + {formatCurrency(loanDetails.loanAmount * 0.15)}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-700">
                    Total Repayment
                  </span>
                  <span className="text-lg font-bold text-[#333333]">
                    {formatCurrency(loanDetails.totalRepayment)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Repayment Date</span>
                <span className="font-semibold text-[#333333]">
                  {repaymentDateFormatted}
                </span>
              </div>
            </div>

            <Button
              className="w-full bg-[#00A651] hover:bg-[#008f45] text-white font-bold h-12 text-base cursor-pointer"
              onClick={() => {
                const { setView, user } = useAppStore.getState();
                setView(user ? 'loan-apply' : 'register');
              }}
            >
              Apply for This Loan
              <ArrowRight className="ml-1 size-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BENEFITS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const BENEFITS = [
  {
    icon: Zap,
    title: 'Fast Approval',
    description: 'Get your loan approved in minutes, not days. Our automated system processes applications instantly.',
    color: 'bg-yellow-50 text-yellow-600',
  },
  {
    icon: Shield,
    title: 'Secure Processing',
    description: 'Bank-level security for your data. Your personal and financial information is always protected.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: CalendarClock,
    title: 'Flexible Repayment',
    description: 'Choose repayment plans that work for you. We offer terms that fit your financial situation.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: Unlock,
    title: 'No Collateral',
    description: 'Unsecured loans up to 500,000. No need to put up your assets as security.',
    color: 'bg-green-50 text-green-600',
  },
  {
    icon: Smartphone,
    title: 'Mobile First',
    description: 'Apply from anywhere on your phone. Our platform is designed for mobile convenience.',
    color: 'bg-rose-50 text-rose-600',
  },
  {
    icon: Eye,
    title: 'Transparent Fees',
    description: 'No hidden charges or surprises. What you see is exactly what you pay.',
    color: 'bg-orange-50 text-orange-600',
  },
];

function BenefitsSection() {
  return (
    <Section id="benefits">
      <SectionTitle>Why Choose MKOPA LOAN?</SectionTitle>
      <SectionSubtitle>
        We&apos;re committed to making borrowing simple, transparent, and
        accessible for everyone.
      </SectionSubtitle>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <Card
              key={benefit.title}
              className="group border-0 shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <CardContent className="pt-6">
                <div
                  className={`mb-4 flex size-12 items-center justify-center rounded-xl ${benefit.color}`}
                >
                  <Icon className="size-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-[#333333]">
                  {benefit.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {benefit.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTIMONIALS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const TESTIMONIALS = [
  {
    name: 'Wanjiku Kamau',
    role: 'Small Business Owner',
    quote:
      'MKOPA LOAN helped me expand my business when I needed capital the most. The process was so fast — I had the money in my account within hours!',
    rating: 5,
  },
  {
    name: 'Otieno Odhiambo',
    role: 'Teacher',
    quote:
      'I was surprised by how transparent the fees are. No hidden charges, no surprises. Exactly what they told me is what I paid. Highly recommend!',
    rating: 5,
  },
  {
    name: 'Amina Hassan',
    role: 'Freelance Designer',
    quote:
      'The mobile-first approach makes everything so convenient. I applied from my phone while on the go and got approved in minutes. Amazing service!',
    rating: 4,
  },
];

function TestimonialsSection() {
  return (
    <Section id="testimonials" className="bg-gray-50">
      <SectionTitle>What Our Customers Say</SectionTitle>
      <SectionSubtitle>
        Thousands of Kenyans trust MKOPA LOAN for their financial needs.
      </SectionSubtitle>

      <div className="grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <Card
            key={testimonial.name}
            className="border-0 shadow-md"
          >
            <CardContent className="pt-6">
              <StarRating count={testimonial.rating} />
              <p className="mt-4 text-gray-600 leading-relaxed italic">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#00A651] text-white font-bold text-sm">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-[#333333]">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-gray-500">{testimonial.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FAQ SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const FAQ_ITEMS = [
  {
    question: 'How do I apply for a loan?',
    answer:
      'Simply create an account, complete your KYC verification, and submit your loan application. The entire process can be completed from your phone in under 10 minutes. Once approved, funds are disbursed directly to your mobile money account.',
  },
  {
    question: 'What are the loan amounts available?',
    answer:
      'We offer loans ranging from KES 5,000 to KES 500,000. Available amounts include: 5,000, 10,000, 20,000, 50,000, 100,000, 200,000, and 500,000. The amount you qualify for depends on your credit profile and KYC verification status.',
  },
  {
    question: 'What is the interest rate and loan term?',
    answer:
      'Our loans carry a flat interest rate of 15% with a 30-day repayment term. For example, if you borrow KES 10,000, your total repayment will be KES 11,500 due in 30 days. There are no hidden charges — what you see is what you pay.',
  },
  {
    question: 'What is KYC and why is it required?',
    answer:
      'KYC (Know Your Customer) is a verification process required by Kenyan financial regulations. You\'ll need to provide your national ID and a selfie. This helps us verify your identity, protect against fraud, and comply with anti-money laundering laws. It\'s a one-time process that typically takes 24-48 hours to verify.',
  },
  {
    question: 'How is my data secured?',
    answer:
      'We use bank-level encryption (256-bit SSL) to protect your personal and financial data. Your information is stored securely and never shared with third parties without your consent. We comply with Kenya\'s Data Protection Act and follow international security best practices.',
  },
  {
    question: 'What happens if I miss a repayment?',
    answer:
      'If you anticipate difficulty in repaying on time, please contact our support team before the due date. We may be able to work out an alternative arrangement. Late payments may incur additional fees and could affect your credit score and future borrowing eligibility.',
  },
];

function FAQSection() {
  return (
    <Section id="faq">
      <SectionTitle>Frequently Asked Questions</SectionTitle>
      <SectionSubtitle>
        Find answers to common questions about our loan products and services.
      </SectionSubtitle>

      <div className="mx-auto max-w-3xl">
        <Card className="border-0 shadow-md">
          <CardContent className="pt-0">
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((faq, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-[#333333] hover:text-[#00A651] hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTACT SECTION
// ═══════════════════════════════════════════════════════════════════════════════
function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would send the message to an API
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', message: '' });
    }, 3000);
  };

  return (
    <Section id="contact" className="bg-gray-50">
      <SectionTitle>Get In Touch</SectionTitle>
      <SectionSubtitle>
        Have questions? We&apos;re here to help. Reach out to us anytime.
      </SectionSubtitle>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Contact Info */}
        <div className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#00A651]/10 text-[#00A651]">
                  <Phone className="size-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#333333]">Phone</h4>
                  <p className="text-gray-500">+254 700 000 000</p>
                  <p className="text-xs text-gray-400">Mon–Fri, 8am–6pm EAT</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#00A651]/10 text-[#00A651]">
                  <Mail className="size-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#333333]">Email</h4>
                  <p className="text-gray-500">support@mkopaloan.com</p>
                  <p className="text-xs text-gray-400">We respond within 24 hours</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#00A651]/10 text-[#00A651]">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#333333]">Address</h4>
                  <p className="text-gray-500">Nairobi, Kenya</p>
                  <p className="text-xs text-gray-400">Westlands, Waiyaki Way</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-6">
            {submitted ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-[#00A651]/10">
                  <CheckCircle2 className="size-8 text-[#00A651]" />
                </div>
                <h3 className="text-lg font-bold text-[#333333]">
                  Message Sent!
                </h3>
                <p className="mt-2 text-gray-500">
                  We&apos;ll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-name">Your Name</Label>
                  <Input
                    id="contact-name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-email">Email Address</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contact-message">Message</Label>
                  <Textarea
                    id="contact-message"
                    placeholder="How can we help you?"
                    rows={4}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#00A651] hover:bg-[#008f45] text-white font-semibold h-11 cursor-pointer"
                >
                  <Send className="mr-2 size-4" />
                  Send Message
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FOOTER
// ═══════════════════════════════════════════════════════════════════════════════
function Footer() {
  return (
    <footer className="bg-[#333333] text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-8 lg:px-16">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="mb-4 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mkopa.png" alt="MKOPA LOAN" className="h-9 w-9 rounded-lg object-cover" />
              <span className="text-xl font-bold">MKOPA LOAN</span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed">
              Empowering Kenyans with instant, transparent, and accessible
              digital lending solutions. Your trusted financial partner.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="#"
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-[#00A651]"
                aria-label="Facebook"
              >
                <Facebook className="size-4" />
              </a>
              <a
                href="#"
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-[#00A651]"
                aria-label="Twitter"
              >
                <Twitter className="size-4" />
              </a>
              <a
                href="#"
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-[#00A651]"
                aria-label="Instagram"
              >
                <Instagram className="size-4" />
              </a>
              <a
                href="#"
                className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-[#00A651]"
                aria-label="LinkedIn"
              >
                <Linkedin className="size-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <a
                  href="#"
                  className="transition-colors hover:text-[#00A651]"
                >
                  About Us
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="transition-colors hover:text-[#00A651]"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="transition-colors hover:text-[#00A651]"
                >
                  Terms of Service
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="transition-colors hover:text-[#00A651]"
                >
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Loan Products */}
          <div>
            <h4 className="mb-4 font-semibold">Loan Products</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              {LOAN_PRODUCTS.slice(0, 5).map((p) => (
                <li key={p.amount}>
                  <a
                    href="#calculator"
                    className="transition-colors hover:text-[#00A651]"
                  >
                    KES {p.amount.toLocaleString()} Loan
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6">
          {/* Payment Partners Logos */}
          <div className="mb-6">
            <p className="mb-3 text-center text-xs uppercase tracking-wider text-gray-500">
              Accepted Payment Methods
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 opacity-90">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/mpesa-logo.png"
                alt="Safaricom M-Pesa"
                className="h-8 w-auto object-contain"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/airtel-logo.png"
                alt="Airtel Money"
                className="h-8 w-auto object-contain"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/visa-mastercard.png"
                alt="Visa Mastercard"
                className="h-6 w-auto object-contain"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logos/pesapal-logo.png"
                alt="Pesapal"
                className="h-6 w-auto object-contain"
              />
            </div>
          </div>
          <div className="text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} MKOPA LOAN. All rights reserved.
            Licensed by the Central Bank of Kenya.
          </div>
        </div>
      </div>
    </footer>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BACK TO TOP BUTTON
// ═══════════════════════════════════════════════════════════════════════════════
function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  React.useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-6 right-6 z-50 flex size-10 items-center justify-center rounded-full bg-[#00A651] text-white shadow-lg transition-transform hover:scale-110 cursor-pointer"
      aria-label="Back to top"
    >
      <ChevronUp className="size-5" />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LANDING PAGE (MAIN EXPORT)
// ═══════════════════════════════════════════════════════════════════════════════
export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8 lg:px-16">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-mkopa.png" alt="MKOPA LOAN" className="h-9 w-9 rounded-lg object-cover" />
            <span className="text-xl font-bold text-[#333333]">
              MKOPA <span className="text-[#00A651]">LOAN</span>
            </span>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#calculator"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-[#00A651]"
            >
              Calculator
            </a>
            <a
              href="#benefits"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-[#00A651]"
            >
              Benefits
            </a>
            <a
              href="#faq"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-[#00A651]"
            >
              FAQ
            </a>
            <a
              href="#contact"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-[#00A651]"
            >
              Contact
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="hidden text-gray-600 hover:text-[#00A651] sm:flex cursor-pointer"
              onClick={() => useAppStore.getState().setView('login')}
            >
              Sign In
            </Button>
            <Button
              className="bg-[#00A651] hover:bg-[#008f45] text-white font-semibold cursor-pointer"
              onClick={() => useAppStore.getState().setView('register')}
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">
        <HeroSection />
        <LoanCalculatorSection />
        <BenefitsSection />
        <TestimonialsSection />
        <FAQSection />
        <ContactSection />
      </main>

      <Footer />
      <BackToTopButton />
    </div>
  );
}
