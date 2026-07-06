'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FascaLogo } from '../../../components/logo/FascaLogo';
import { FascaButton } from '../../../components/ui/FascaButton';
import { getBackendUrl } from '../../../lib/api';

/**
 * Animated Network Nodes Canvas Component (consistent with main auth page)
 */
const NodeCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = 35;
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        radius: Math.random() * 1.5 + 1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(124, 92, 252, 0.05)';
      ctx.lineWidth = 0.75;

      for (let i = 0; i < particleCount; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particleCount; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      ctx.fillStyle = 'rgba(124, 92, 252, 0.25)';
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!token) {
      setValidationError('Authorization token is missing or invalid.');
      return;
    }

    if (!password || !confirmPassword) {
      setValidationError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Security key must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      const apiBase = getBackendUrl();
      const res = await fetch(`${apiBase}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      if (res.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          router.push('/auth?tab=login');
        }, 1800);
      } else {
        const data = await res.json();
        setValidationError(data.message || 'Failed to reset key. The link might be expired.');
      }
    } catch (err) {
      setValidationError('Connection failed. Verify NestJS backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] bg-fouzar-card/90 border border-[#7c5cfc] rounded-none shadow-2xl overflow-hidden z-10 backdrop-blur-md">
      {/* Code Editor Tab Header */}
      <div className="flex bg-fouzar-bg/40 border-b border-fouzar-border-strong py-3.5 px-4 items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-widest text-fouzar-text-primary">
          RESET_KEY.tsx
        </span>
        <Link
          href="/auth?tab=login"
          className="text-[7.5px] font-mono uppercase text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors"
        >
          [Cancel]
        </Link>
      </div>

      <form onSubmit={handleReset} className="p-6 space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col">
            <span className="text-[7.5px] font-mono uppercase text-fouzar-text-secondary tracking-wider mb-1">
              New Security Key
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent border-b border-fouzar-border-strong px-1 py-2 text-xs text-fouzar-text-primary placeholder-[#6b6b8a]/50 focus:outline-none focus:border-[#7c5cfc] rounded-none transition-colors"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[7.5px] font-mono uppercase text-fouzar-text-secondary tracking-wider mb-1">
              Confirm Security Key
            </span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent border-b border-fouzar-border-strong px-1 py-2 text-xs text-fouzar-text-primary placeholder-[#6b6b8a]/50 focus:outline-none focus:border-[#7c5cfc] rounded-none transition-colors"
            />
          </div>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {validationError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-3 bg-[#ff2d55]/5 border border-[#ff2d55]/20 text-[#ff2d55] font-mono text-[8.5px] leading-relaxed text-left uppercase tracking-wider"
            >
              {validationError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success check overlay */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-fouzar-bg/95 z-20 flex flex-col items-center justify-center gap-4"
            >
              <div className="relative flex items-center justify-center w-16 h-16 rounded-full border border-[#7c5cfc]/30 bg-fouzar-surface/50">
                <motion.svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#7c5cfc"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <motion.path
                    d="M20 6L9 17L4 12"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </motion.svg>
              </div>
              <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#7c5cfc] animate-pulse">
                Security Key Updated. Connecting...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <FascaButton
          type="submit"
          disabled={isLoading || !token}
          variant="solid-violet"
          className="w-full rounded-none font-bold py-3 text-[10px]"
        >
          {isLoading ? 'CONFIGURING...' : 'RESET SECURITY KEY'}
        </FascaButton>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen w-full relative bg-fouzar-bg flex items-center justify-center p-6 select-none overflow-hidden font-sans">
      {/* Node Canvas background */}
      <div className="absolute inset-0 z-0 opacity-60">
        <NodeCanvas />
      </div>

      {/* Return to login link */}
      <Link
        href="/auth?tab=login"
        className="absolute top-8 left-8 flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-fouzar-text-secondary hover:text-fouzar-text-primary transition-colors cursor-pointer z-10"
      >
        <ArrowLeft className="w-3 h-3" /> return
      </Link>

      <div className="flex flex-col items-center gap-8 w-full z-10">
        {/* Brand Logo Header */}
        <FascaLogo showWordmark={true} size={28} />

        {/* Suspense wrapper for SearchParams consumption */}
        <Suspense
          fallback={
            <div className="w-full max-w-[420px] bg-fouzar-card/90 border border-[#7c5cfc]/20 p-8 flex items-center justify-center font-mono text-[9px] uppercase tracking-widest text-fouzar-text-secondary">
              Initializing connection credentials...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
