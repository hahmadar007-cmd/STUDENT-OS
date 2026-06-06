'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FascaLogo } from '../../components/logo/FascaLogo';
import { FascaButton } from '../../components/ui/FascaButton';

/**
 * Animated Network Nodes Canvas Component
 * Renders a slow-moving, dark network node visualization for the right 60% panel.
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

    const particleCount = 45;
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
        vx: (Math.random() - 0.5) * 0.2, // very slow moving
        vy: (Math.random() - 0.5) * 0.2,
        radius: Math.random() * 1.5 + 1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, width, height);

      // Draw connections
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

      // Draw particles
      ctx.fillStyle = 'rgba(124, 92, 252, 0.3)';
      for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Update positions
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off bounds
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

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'register') {
        setActiveTab('register');
      } else if (tabParam === 'login') {
        setActiveTab('login');
      }
    }
  }, []);

  
  // Form values
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [universityName, setUniversityName] = useState('');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    let cancelled = false;

    const checkBackend = async () => {
      try {
        const res = await fetch(`${apiBase}/health`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error('Health check failed');
        const data = await res.json();
        if (!cancelled) {
          setBackendStatus(data.database === 'connected' ? 'online' : 'offline');
        }
      } catch {
        if (!cancelled) setBackendStatus('offline');
      }
    };

    checkBackend();
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setIsLoading(true);

    const endpoint = activeTab === 'login' ? '/auth/login' : '/auth/register';
    const payload = activeTab === 'login' 
      ? { email, password }
      : { email, password, name, universityName };

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        if (data.accessToken) {
          localStorage.setItem('token', data.accessToken);
        }
        localStorage.setItem('user', JSON.stringify(data.user || data));
        
        setTimeout(() => {
          router.push('/dashboard');
        }, 1800);
      } else {
        setValidationError(data.message || 'Authentication failed. Verify coordinates.');
      }
    } catch {
      if (backendStatus === 'offline') {
        setValidationError(
          `Cannot reach the backend at ${apiBase}. Run "npm run dev:backend" in the project folder, then refresh this page.`,
        );
      } else {
        setValidationError('Connection failed. Check that the backend is running on port 3001.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative bg-[#0a0a0f] flex flex-col lg:flex-row select-none overflow-hidden font-sans">
      
      {/* Dynamic Success Checkmark Screen */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0a0a0f] z-50 flex flex-col items-center justify-center gap-4"
          >
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full border border-[#7c5cfc]/30 bg-[#111118]/50">
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
              Fasca core authorized
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. LEFT 40%: The Auth Form Container */}
      <div className="w-full lg:w-[40%] flex flex-col justify-center px-8 sm:px-16 lg:px-12 xl:px-16 py-12 z-10 bg-[#111118]/80 relative backdrop-blur-md shrink-0 border-r border-[#2a2a3a]/40">
        
        {/* Back Link */}
        <Link
          href="/"
          className="absolute top-8 left-8 flex items-center gap-1.5 text-[8px] font-mono uppercase tracking-widest text-[#6b6b8a] hover:text-[#f0f0ff] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3 h-3" /> return
        </Link>

        {/* Brand Logo Header */}
        <div className="mb-10 text-left mt-6">
          <FascaLogo showWordmark={true} size={28} />
        </div>

        {backendStatus === 'offline' && (
          <div className="mb-4 p-3 bg-[#ff2d55]/5 border border-[#ff2d55]/20 text-[#ff2d55] font-mono text-[8.5px] leading-relaxed uppercase tracking-wider">
            Backend offline. Start it with: npm run dev:backend
          </div>
        )}

        {/* Auth form card (no border radius, 1px violet border) */}
        <div className="w-full bg-[#16161f] border border-[#7c5cfc] rounded-none shadow-2xl overflow-hidden">
          
          {/* Code Editor Styled Tabs */}
          <div className="flex bg-[#0a0a0f]/40 border-b border-[#2a2a3a]">
            {/* REGISTER TAB */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setValidationError(null);
              }}
              className="relative flex-1 py-3.5 font-mono text-[9px] uppercase tracking-widest text-center cursor-pointer transition-colors"
              style={{
                color: activeTab === 'register' ? '#f0f0ff' : '#6b6b8a',
                backgroundColor: activeTab === 'register' ? '#16161f' : 'transparent',
              }}
            >
              REGISTER.tsx
              {activeTab === 'register' && (
                <motion.div
                  layoutId="activeTabBorder"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7c5cfc]"
                />
              )}
            </button>

            {/* LOGIN TAB */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setValidationError(null);
              }}
              className="relative flex-1 py-3.5 font-mono text-[9px] uppercase tracking-widest text-center cursor-pointer transition-colors"
              style={{
                color: activeTab === 'login' ? '#f0f0ff' : '#6b6b8a',
                backgroundColor: activeTab === 'login' ? '#16161f' : 'transparent',
              }}
            >
              LOGIN.tsx
              {activeTab === 'login' && (
                <motion.div
                  layoutId="activeTabBorder"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7c5cfc]"
                />
              )}
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleAuth} className="p-6 space-y-6">
            
            <AnimatePresence mode="wait">
              {activeTab === 'register' ? (
                /* ========================================================================= */
                /* REGISTER FIELDS                                                           */
                /* ========================================================================= */
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div className="flex flex-col">
                    <span className="text-[7.5px] font-mono uppercase text-[#6b6b8a] tracking-wider mb-1">Email address</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@university.edu"
                      className="w-full bg-transparent border-b border-[#2a2a3a] px-1 py-2 text-xs text-[#f0f0ff] placeholder-[#6b6b8a]/50 focus:outline-none focus:border-[#7c5cfc] rounded-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[7.5px] font-mono uppercase text-[#6b6b8a] tracking-wider mb-1">Full Name</span>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Mercer"
                      className="w-full bg-transparent border-b border-[#2a2a3a] px-1 py-2 text-xs text-[#f0f0ff] placeholder-[#6b6b8a]/50 focus:outline-none focus:border-[#7c5cfc] rounded-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[7.5px] font-mono uppercase text-[#6b6b8a] tracking-wider mb-1">University Name</span>
                    <input
                      type="text"
                      required
                      value={universityName}
                      onChange={(e) => setUniversityName(e.target.value)}
                      placeholder="Massachusetts Institute of Technology"
                      className="w-full bg-transparent border-b border-[#2a2a3a] px-1 py-2 text-xs text-[#f0f0ff] placeholder-[#6b6b8a]/50 focus:outline-none focus:border-[#7c5cfc] rounded-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[7.5px] font-mono uppercase text-[#6b6b8a] tracking-wider mb-1">Security Key</span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent border-b border-[#2a2a3a] px-1 py-2 text-xs text-[#f0f0ff] placeholder-[#6b6b8a]/50 focus:outline-none focus:border-[#7c5cfc] rounded-none transition-colors"
                    />
                  </div>
                </motion.div>
              ) : (
                /* ========================================================================= */
                /* LOGIN FIELDS                                                              */
                /* ========================================================================= */
                <motion.div
                  key="login-fields"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-4"
                >
                  <div className="flex flex-col">
                    <span className="text-[7.5px] font-mono uppercase text-[#6b6b8a] tracking-wider mb-1">Email address</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@university.edu"
                      className="w-full bg-transparent border-b border-[#2a2a3a] px-1 py-2 text-xs text-[#f0f0ff] placeholder-[#6b6b8a]/50 focus:outline-none focus:border-[#7c5cfc] rounded-none transition-colors"
                    />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[7.5px] font-mono uppercase text-[#6b6b8a] tracking-wider mb-1">Security Key</span>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent border-b border-[#2a2a3a] px-1 py-2 text-xs text-[#f0f0ff] placeholder-[#6b6b8a]/50 focus:outline-none focus:border-[#7c5cfc] rounded-none transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error Message rendering */}
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

            {/* Form Submit Button (Solid violet, full width, uppercase, sharp rectangular) */}
            <FascaButton
              type="submit"
              disabled={isLoading}
              variant="solid-violet"
              className="w-full rounded-none font-bold py-3 text-[10px]"
            >
              {isLoading ? 'EXECUTING...' : activeTab === 'login' ? 'ESTABLISH CONNECT' : 'REGISTER WORKSPACE'}
            </FascaButton>

          </form>
        </div>

      </div>

      {/* 2. RIGHT 60%: Beautiful Cyan Graphic with Node Canvas overlay */}
      <div className="hidden lg:block lg:w-[60%] h-full relative bg-[#0a0a0f] overflow-hidden">
        {/* The Graphic background with scale transition */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-105"
          style={{
            backgroundImage: "url('/graduation-hats.png')",
          }}
        />
        {/* Radial & Linear dark overlays to make it blend into the left dark panel */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]/50 z-10" />
        
        {/* Animated Network nodes overlay on top of the image */}
        <div className="absolute inset-0 z-20 mix-blend-screen opacity-65">
          <NodeCanvas />
        </div>

        {/* Feature overlay cards/texts */}
        <div className="absolute bottom-12 left-12 right-12 z-30 flex flex-col gap-4 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="p-6 bg-[#111118]/80 border border-[#7c5cfc]/30 backdrop-blur-md"
          >
            <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-[#7c5cfc] block mb-2">
              STUDENT OS ENVIRONMENT
            </span>
            <h2 className="font-serif text-2xl font-bold text-[#f0f0ff] mb-2 leading-tight">
              Unlock your academic potential.
            </h2>
            <p className="text-[9px] font-mono text-[#6b6b8a] uppercase tracking-wider leading-relaxed">
              Connect with peers, access powerful AI study companions, and experience next-level productivity in real time.
            </p>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
