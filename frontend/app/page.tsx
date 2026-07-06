// ============================================================================
// Copyright (c) 2025 hahmadar007-cmd. All Rights Reserved.
// STUDENT-OS — Proprietary & Confidential Software.
// Unauthorized copying, modification, distribution, or use of this file,
// via any medium, is strictly prohibited and punishable by law.
// See LICENSE file for full legal terms and penalties.
// ============================================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown, Users, Cpu, Shield, Plug, ArrowRight } from 'lucide-react';
import { FascaLogo } from '../components/logo/FascaLogo';
import { FascaButton } from '../components/ui/FascaButton';

export default function LandingPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    {
      src: '/graduation-hats.png',
      tag: 'STUDENT OS',
      title: 'Fasca Workspace Platform',
      badge: 'LIVE SYNC ACTIVE',
      color: '#7c5cfc',
    },
    {
      src: '/study-book.png',
      tag: 'STUDY ASSETS',
      title: 'Resource Ledger & Materials',
      badge: 'OFFLINE MODE SYNCED',
      color: '#ff2d55',
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const scrollToInfo = () => {
    document.getElementById('info-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen relative select-none bg-fouzar-bg text-fouzar-text-primary font-sans antialiased overflow-x-hidden">
      
      {/* Background radial grid */}
      <motion.div
        animate={{ opacity: [0.08, 0.2, 0.08] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(#2a2a3a 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Navigation Bar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <Link href="/" className="cursor-pointer">
          <FascaLogo showWordmark={true} size={30} />
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/auth?tab=login">
            <FascaButton variant="ghost-violet" className="text-[9px] font-mono uppercase tracking-widest px-4 py-1.5 rounded-[6px]">
              SIGN IN
            </FascaButton>
          </Link>
          <Link href="/auth?tab=register">
            <FascaButton variant="solid-violet" className="text-[9px] font-mono uppercase tracking-widest px-4 py-1.5 rounded-[6px]">
              SIGN UP
            </FascaButton>
          </Link>
        </div>

      </nav>

      {/* Hero Body Container */}
      <main className="flex-1 flex flex-col justify-center max-w-7xl mx-auto px-6 z-10 relative py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Copy/CTAs */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left">
            {/* Fasca Logo Reveal */}
            <motion.div
              initial={{ clipPath: 'polygon(50% 0%, 50% 0%, 50% 100%, 50% 100%)', scale: 0.9, opacity: 0 }}
              animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)', scale: 1, opacity: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
              <FascaLogo showWordmark={false} size={84} />
            </motion.div>

            {/* Tagline */}
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-[0.05em] text-fouzar-text-primary leading-none mb-6">
                Study like you mean it.
              </h1>
            </motion.div>

            {/* Subtext */}
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <p className="text-fouzar-text-secondary text-xs md:text-sm font-light max-w-lg leading-relaxed mb-10">
                Real-time collaboration. AI that knows your slide. Focus mode your peers will notice.
              </p>
            </motion.div>

            {/* CTA Buttons Row */}
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 items-center"
            >
              <div className="relative group p-[1px] bg-transparent rounded-none overflow-hidden cursor-pointer active:scale-98">
                <Link href="/auth" className="block w-full h-full rounded-none">
                  {/* Violet gradient border backdrop */}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#7c5cfc] via-[#aa9cfc] to-[#7c5cfc] transition-opacity duration-300 group-hover:opacity-0" />
                  {/* Solid violet background on hover */}
                  <div className="absolute inset-0 bg-[#7c5cfc] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {/* Inner text container */}
                  <div className="relative px-10 py-4 bg-fouzar-bg text-fouzar-text-primary group-hover:bg-transparent group-hover:text-[#0a0a0f] transition-all duration-300 text-[10px] font-mono font-bold uppercase tracking-[0.25em] rounded-none">
                    ENTER FASCA
                  </div>
                </Link>
              </div>

              <FascaButton
                variant="ghost-violet"
                onClick={scrollToInfo}
                className="text-[9px] font-mono uppercase tracking-widest px-6 py-4 rounded-none border border-fouzar-border-strong flex items-center gap-2"
              >
                EXPLORE INFO <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
              </FascaButton>
            </motion.div>
          </div>

          {/* Right Column: Hero Graphic Preview (Interactive Carousel) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="relative w-full max-w-lg aspect-[16/9] border rounded-none overflow-hidden bg-fouzar-surface/60 p-1.5 shadow-[0_0_50px_-12px_rgba(124,92,252,0.3)] group cursor-pointer transition-colors duration-500"
              style={{ borderColor: `${slides[currentSlide].color}30` }}
            >
              {/* Outer frame neon line */}
              <div 
                className="absolute inset-0 bg-gradient-to-tr pointer-events-none transition-all duration-700" 
                style={{
                  backgroundImage: `linear-gradient(to top right, ${slides[currentSlide].color}20, transparent, ${currentSlide === 0 ? 'rgba(6,182,212,0.2)' : 'rgba(236,72,153,0.2)'})`
                }}
              />
              
              {/* The Image Wrapper with Framer Motion AnimatePresence for transitions */}
              <div className="w-full h-full overflow-hidden relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full h-full relative"
                  >
                    <img 
                      src={slides[currentSlide].src} 
                      alt={slides[currentSlide].title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-85" />
                    
                    {/* Floating tags */}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-10">
                      <div className="flex flex-col">
                        <span 
                          className="text-[8.5px] font-mono uppercase tracking-[0.25em] transition-colors duration-500 font-bold"
                          style={{ color: slides[currentSlide].color }}
                        >
                          {slides[currentSlide].tag}
                        </span>
                        <span className="text-xs font-serif font-bold text-fouzar-text-primary mt-0.5">
                          {slides[currentSlide].title}
                        </span>
                      </div>
                      <span 
                        className="text-[7.5px] font-mono text-fouzar-text-secondary uppercase tracking-wider bg-fouzar-bg/80 px-2 py-0.5 border"
                        style={{ borderColor: `${slides[currentSlide].color}30` }}
                      >
                        {slides[currentSlide].badge}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Slider Dots Overlay */}
              <div className="absolute top-4 right-4 flex gap-1.5 z-20">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlide(idx)}
                    className="w-2.5 h-2.5 rounded-full cursor-pointer transition-all duration-300"
                    style={{
                      backgroundColor: currentSlide === idx ? slides[idx].color : '#2a2a3a',
                      transform: currentSlide === idx ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </motion.div>
          </div>

        </div>

        {/* Scroll indicator for mobile/desktop */}
        <div className="flex justify-center mt-12 lg:mt-6">
          <button 
            onClick={scrollToInfo}
            className="flex flex-col items-center gap-1 text-[7.5px] font-mono uppercase tracking-[0.3em] text-fouzar-text-secondary hover:text-[#7c5cfc] transition-colors cursor-pointer bg-transparent border-none"
          >
            <span>SCROLL TO EXPLORE</span>
            <ArrowDown className="w-3.5 h-3.5 animate-bounce mt-1 text-[#7c5cfc]" />
          </button>
        </div>
      </main>

      {/* Scroll Down Page Section (Detailed information) */}
      <section 
        id="info-section" 
        className="w-full min-h-screen bg-fouzar-surface/80 border-t border-fouzar-border-strong/40 relative z-10 py-24 flex flex-col justify-center"
      >
        {/* Subtle grid backdrop inside the section */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#161623_1px,transparent_1px),linear-gradient(to_bottom,#161623_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-12 gap-16 items-center relative">
          
          {/* Left Column: Large Styled Polaroid/Framed Image */}
          <div className="lg:col-span-6 flex justify-center order-last lg:order-first">
            <motion.div 
              whileInView={{ opacity: 1, x: 0 }}
              initial={{ opacity: 0, x: -30 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="w-full max-w-md bg-fouzar-card border border-fouzar-border-strong p-4 shadow-2xl relative"
            >
              {/* Top editor bar styling */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-fouzar-border-strong">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#ff2d55]" />
                  <div className="w-2 h-2 rounded-full bg-[#ffcc00]" />
                  <div className="w-2 h-2 rounded-full bg-[#00cd46]" />
                </div>
                <span className="text-[7.5px] font-mono text-fouzar-text-secondary uppercase tracking-widest">
                  study_materials.png
                </span>
              </div>

              {/* Styled Image */}
              <div className="aspect-square bg-rose-950/20 overflow-hidden relative border border-fouzar-border-strong">
                <img 
                  src="/study-book.png" 
                  alt="Student OS Study Assets" 
                  className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-all duration-700"
                />
                
                {/* Cyberpunk grid overlay (pink/magenta glow) */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ff2d55_1px,transparent_1px),linear-gradient(to_bottom,#ff2d55_1px,transparent_1px)] bg-[size:20px_20px] mix-blend-overlay opacity-25 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#16161f] via-transparent to-transparent opacity-90" />
                
                {/* Overlay details */}
                <div className="absolute bottom-4 left-4">
                  <p className="text-[8px] font-mono text-[#ff2d55] uppercase tracking-widest font-bold">
                    STUDY CORE ASSETS V1.0
                  </p>
                  <p className="text-lg font-serif font-bold text-fouzar-text-primary mt-0.5">
                    Interactive Study Ledger
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[7.5px] font-mono text-fouzar-text-secondary uppercase tracking-wider">
                <span>RESOURCE CACHE STABLE</span>
                <span className="text-[#00cd46] animate-pulse">● DATABASE CONNECTED</span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Information about the Website */}
          <div className="lg:col-span-6 flex flex-col text-left">
            <motion.div
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 30 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-block border-l-2 border-[#ff2d55] pl-3">
                <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#ff2d55]">
                  ABOUT THE PLATFORM
                </span>
                <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-[0.02em] text-fouzar-text-primary mt-1">
                  What is Student OS?
                </h2>
              </div>

              <p className="text-fouzar-text-secondary text-xs font-light leading-relaxed">
                Fasca Student OS is a custom-engineered workspace crafted specifically for academic focus and collaboration. It merges peer presence networking, interactive slide-synced classrooms, and direct AI companion assets to redefine how you approach study sessions.
              </p>

              {/* Grid of Key Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                
                {/* Feature 1 */}
                <div className="space-y-2 border-t border-fouzar-border-strong/60 pt-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#ff2d55]" />
                    <h3 className="font-mono text-[10px] uppercase font-bold tracking-wider text-fouzar-text-primary">
                      Study Circles
                    </h3>
                  </div>
                  <p className="text-fouzar-text-secondary text-[9px] font-mono leading-relaxed uppercase">
                    Connect in peer-to-peer study streams with live presence indicators and shared sync targets.
                  </p>
                </div>

                {/* Feature 2 */}
                <div className="space-y-2 border-t border-fouzar-border-strong/60 pt-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#ff2d55]" />
                    <h3 className="font-mono text-[10px] uppercase font-bold tracking-wider text-fouzar-text-primary">
                      AI Core Guidance
                    </h3>
                  </div>
                  <p className="text-fouzar-text-secondary text-[9px] font-mono leading-relaxed uppercase">
                    Your AI companion understands your slide deck context and assists you instantly with queries.
                  </p>
                </div>

                {/* Feature 3 */}
                <div className="space-y-2 border-t border-fouzar-border-strong/60 pt-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-[#ff2d55]" />
                    <h3 className="font-mono text-[10px] uppercase font-bold tracking-wider text-fouzar-text-primary">
                      Deep Focus Shield
                    </h3>
                  </div>
                  <p className="text-fouzar-text-secondary text-[9px] font-mono leading-relaxed uppercase">
                    Trigger custom cognitive flow timers and shield block configurations to silence notifications.
                  </p>
                </div>

                {/* Feature 4 */}
                <div className="space-y-2 border-t border-fouzar-border-strong/60 pt-4">
                  <div className="flex items-center gap-2">
                    <Plug className="w-4 h-4 text-[#ff2d55]" />
                    <h3 className="font-mono text-[10px] uppercase font-bold tracking-wider text-fouzar-text-primary">
                      LMS Bridge Panel
                    </h3>
                  </div>
                  <p className="text-fouzar-text-secondary text-[9px] font-mono leading-relaxed uppercase">
                    Bridge deadlines and course materials from Canvas, Blackboard, or external calendars.
                  </p>
                </div>

              </div>

              {/* Secondary CTA */}
              <div className="pt-6">
                <Link href="/auth">
                  <FascaButton
                    variant="solid-violet"
                    className="text-[9px] font-mono uppercase tracking-widest px-8 py-3 rounded-none flex items-center gap-2"
                  >
                    GET STARTED NOW <ArrowRight className="w-3.5 h-3.5" />
                  </FascaButton>
                </Link>
              </div>

            </motion.div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-fouzar-border-strong/40 flex items-center justify-between text-[8px] font-mono text-fouzar-text-secondary z-10 uppercase tracking-widest relative">
        <div className="flex items-center gap-2.5">
          <span>FASCA</span>
          <span className="w-[1.5px] h-2.5 bg-[#2a2a3a]" />
          <span>V1.0</span>
        </div>
        <span className="text-fouzar-text-secondary">
          © 2025 hahmadar007-cmd — All Rights Reserved. Proprietary & Confidential.
        </span>
      </footer>

    </div>
  );
}
