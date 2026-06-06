'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FascaLogo } from '../components/logo/FascaLogo';
import { FascaButton } from '../components/ui/FascaButton';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden select-none bg-[#0a0a0f] text-[#f0f0ff] font-sans antialiased">
      
      <motion.div
        animate={{ opacity: [0.08, 0.2, 0.08] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(#2a2a3a 1.2px, transparent 1.2px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* 2. Navigation Bar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10">
        <Link href="/" className="cursor-pointer">
          <FascaLogo showWordmark={true} size={30} />
        </Link>
        <Link href="/auth">
          <FascaButton variant="ghost-violet" className="text-[9px] font-mono uppercase tracking-widest px-4 py-1.5 rounded-[6px]">
            SIGN IN
          </FascaButton>
        </Link>
      </nav>

      {/* 3. Hero Body Container */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto px-6 text-center z-10 py-16">
        
        {/* Fasca Logo Reveal (wings-unfold clip-path) */}
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
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-[0.05em] text-[#f0f0ff] leading-none mb-6">
            Study like you mean it.
          </h1>
        </motion.div>

        {/* Subtext */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <p className="text-[#6b6b8a] text-xs md:text-sm font-light max-w-lg leading-relaxed mb-10">
            Real-time collaboration. AI that knows your slide. Focus mode your peers will notice.
          </p>
        </motion.div>

        {/* CTA Button (Sharp rectangular, gradient border, hover solid violet) */}
        <motion.div
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="relative group p-[1px] bg-transparent rounded-none overflow-hidden cursor-pointer active:scale-98"
        >
          <Link href="/auth" className="block w-full h-full rounded-none">
            {/* Violet gradient border backdrop */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#7c5cfc] via-[#aa9cfc] to-[#7c5cfc] transition-opacity duration-300 group-hover:opacity-0" />
            {/* Solid violet background on hover */}
            <div className="absolute inset-0 bg-[#7c5cfc] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {/* Inner text container */}
            <div className="relative px-10 py-4 bg-[#0a0a0f] text-[#f0f0ff] group-hover:bg-transparent group-hover:text-[#0a0a0f] transition-all duration-300 text-[10px] font-mono font-bold uppercase tracking-[0.25em] rounded-none">
              ENTER FASCA
            </div>
          </Link>
        </motion.div>

      </main>

      {/* 4. Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-6 border-t border-[#2a2a3a]/40 flex items-center justify-between text-[8px] font-mono text-[#6b6b8a] z-10 mt-auto uppercase tracking-widest">
        <div className="flex items-center gap-2.5">
          <span>FASCA</span>
          <span className="w-[1.5px] h-2.5 bg-[#2a2a3a]" />
          <span>V1.0</span>
        </div>
        <a 
          href="https://github.com/fasca" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-[#7c5cfc] transition-colors"
        >
          OPEN SOURCE
        </a>
      </footer>

    </div>
  );
}
