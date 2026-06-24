'use client';

import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinished: () => void;
  minDuration?: number; // in milliseconds
}

/**
 * Premium M-KOPA LOAN splash screen.
 *
 * Design references (per brand brief):
 * - Brand colors: #00C853, #009624, #FFC107, #FFFFFF, #E6E6E6
 * - Bold "M-KOPA" with yellow hyphen, lighter "LOAN" + tagline below
 * - Modern green gradient background with subtle light effects
 * - Soft glow around the new logo for a premium feel
 * - Smoother, modern progress bar with shimmer
 * - Mobile-first (1080×1920)
 */
export default function SplashScreen({ onFinished, minDuration = 2800 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [statusText, setStatusText] = useState('Preparing');
  const [logoVisible, setLogoVisible] = useState(false);
  const [textVisible, setTextVisible] = useState(false);
  const [shimmerX, setShimmerX] = useState(-100);

  useEffect(() => {
    // Staggered mount animation sequence
    requestAnimationFrame(() => setMounted(true));

    const t1 = setTimeout(() => setLogoVisible(true), 150);
    const t2 = setTimeout(() => setTextVisible(true), 550);

    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // ease-out cubic for smoother progress curve
      const t = Math.min(elapsed / minDuration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const pct = Math.min(eased * 100, 100);
      setProgress(pct);

      if (pct >= 92) setStatusText('Ready');
      else if (pct >= 55) setStatusText('Preparing');
      else if (pct >= 20) setStatusText('Loading');
      else setStatusText('Starting');
    }, 30);

    // Shimmer sweep across the progress bar
    const shimmerInterval = setInterval(() => {
      setShimmerX((prev) => (prev >= 200 ? -100 : prev + 6));
    }, 24);

    const timer = setTimeout(() => {
      clearInterval(progressInterval);
      clearInterval(shimmerInterval);
      setProgress(100);
      setStatusText('Ready');
      setFadeOut(true);
      setTimeout(onFinished, 600);
    }, minDuration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(timer);
      clearInterval(progressInterval);
      clearInterval(shimmerInterval);
    };
  }, [minDuration, onFinished]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-600 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background:
          'linear-gradient(150deg, #007a3d 0%, #009624 22%, #00A651 48%, #00C853 78%, #1ad87a 100%)',
      }}
    >
      {/* ── Layered light effects for premium depth ─────────────────────── */}
      {/* Subtle dotted pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.55) 1px, transparent 1.2px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* Large top-right glow orb */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 size-[28rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,215,0,0.18) 0%, rgba(255,215,0,0.04) 35%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      {/* Large bottom-left glow orb */}
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 size-[26rem] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(0,255,140,0.18) 0%, rgba(0,255,140,0.04) 40%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      {/* Diagonal sheen streak */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.08) 48%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0.08) 52%, transparent 70%)',
        }}
      />
      {/* Vignette for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,40,20,0.35) 100%)',
        }}
      />

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div
        className={`relative flex flex-col items-center transition-all duration-700 ease-out ${
          mounted ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
        }`}
      >
        {/* New M-KOPA Logo with soft glow */}
        <div
          className={`relative mb-7 transition-all duration-700 ease-out ${
            logoVisible ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
          }`}
        >
          {/* Outer soft glow halo (premium feel) */}
          <div
            className="absolute inset-[-24px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,215,0,0.35) 0%, rgba(0,200,83,0.18) 40%, transparent 70%)',
              filter: 'blur(18px)',
            }}
          />
          {/* Secondary white halo for crisp logo pop */}
          <div
            className="absolute inset-[-6px] rounded-full"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.15) 50%, transparent 75%)',
              filter: 'blur(8px)',
            }}
          />

          {/* Logo image — circular crop so only the green ring shows */}
          <div
            className="relative size-28 sm:size-32 rounded-full overflow-hidden ring-2 ring-white/40 shadow-2xl"
            style={{
              boxShadow:
                '0 18px 45px -10px rgba(0,0,0,0.45), 0 0 0 4px rgba(255,255,255,0.08), inset 0 0 0 1px rgba(255,255,255,0.15)',
            }}
          >
            <img
              src="/logo-splash-new.png"
              alt="M-KOPA Loan logo"
              className="block h-full w-full object-cover select-none"
              draggable={false}
            />
          </div>

          {/* Animated pulse ring (subtle, premium) */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              border: '2px solid rgba(255,215,0,0.55)',
              animation: 'splashPulse 2.4s ease-out infinite',
            }}
          />
        </div>

        {/* Brand Name — M-KOPA with gold hyphen */}
        <div
          className={`flex items-baseline transition-all duration-700 ease-out ${
            textVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          <h1
            className="text-4xl sm:text-5xl font-extrabold text-white tracking-wide"
            style={{
              textShadow: '0 2px 14px rgba(0,0,0,0.35), 0 0 22px rgba(255,215,0,0.18)',
              letterSpacing: '0.02em',
            }}
          >
            M
            <span className="text-[#FFC107] mx-0.5 font-black">-</span>
            KOPA
          </h1>
        </div>

        {/* "LOAN" text — lighter weight per brief */}
        <p
          className={`text-lg sm:text-xl font-light text-white/95 tracking-[0.45em] uppercase mt-2 mb-1 transition-all duration-700 delay-100 ease-out ${
            textVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
          style={{ textShadow: '0 1px 6px rgba(0,0,0,0.25)' }}
        >
          Loan
        </p>

        {/* Tagline */}
        <p
          className={`text-sm font-light text-white/75 mb-10 transition-all duration-700 delay-200 ease-out ${
            textVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
          }`}
        >
          Instant Digital Loans
        </p>

        {/* Loading Progress Bar — smoother + modern */}
        <div className="w-60 sm:w-72">
          <div className="relative h-2 w-full rounded-full bg-white/12 overflow-hidden backdrop-blur-sm ring-1 ring-white/10">
            {/* Track gradient fill */}
            <div
              className="relative h-full rounded-full transition-all duration-100 ease-linear"
              style={{
                width: `${progress}%`,
                background:
                  'linear-gradient(90deg, #FFC107 0%, #FFD54F 35%, #FFE082 55%, #FFC107 75%, #FF8F00 100%)',
                boxShadow:
                  '0 0 14px rgba(255,193,7,0.65), 0 0 6px rgba(255,255,255,0.4) inset',
              }}
            >
              {/* Shimmer overlay sweeping across the filled portion */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: 'inset(0 0 0 0)' }}
              >
                <div
                  className="absolute top-0 bottom-0 w-16"
                  style={{
                    left: `${shimmerX}%`,
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.85) 50%, transparent 100%)',
                    filter: 'blur(2px)',
                  }}
                />
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-white/65 font-medium tracking-wide">
            {statusText}...
          </p>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-6 text-center px-4">
        <p className="text-[10px] text-white/35 tracking-[0.18em] uppercase font-medium">
          &copy; {new Date().getFullYear()} M-KOPA Loan &middot; All rights reserved
        </p>
      </div>
    </div>
  );
}
