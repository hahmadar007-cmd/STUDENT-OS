'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import QRCode from 'react-qr-code';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronRight, Shield, BrainCircuit, MonitorPlay } from 'lucide-react';
import { FascaLogo } from '../components/logo/FascaLogo';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });
  const [showQR, setShowQR] = useState(false);

  const heroY = useTransform(scrollYProgress, [0, 0.2], [0, 150]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);

  return (
    <div ref={containerRef} className="flex flex-col min-h-[200vh] relative bg-[#060609] text-[#e0e0e0] font-sans antialiased overflow-x-hidden selection:bg-[#7c5cfc] selection:text-white">
      
      {/* Dynamic Backgrounds */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#7c5cfc] rounded-full blur-[180px] opacity-10 mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ff2d55] rounded-full blur-[160px] opacity-10 mix-blend-screen" />
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03]" />
      </div>

      {/* Navigation */}
      <nav className="fixed w-full max-w-7xl left-1/2 -translate-x-1/2 px-6 py-6 flex items-center justify-between z-50 mix-blend-difference">
        <Link href="/" className="cursor-pointer">
          <FascaLogo showWordmark={true} size={32} layout="horizontal" />
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/auth?tab=login" className="text-xs font-mono uppercase tracking-[0.15em] text-[#a0a0a0] hover:text-white transition-colors duration-300">
            Login
          </Link>
          <Link href="/auth?tab=register" className="relative group px-6 py-2.5 overflow-hidden rounded-full bg-white/5 border border-white/10 hover:border-[#7c5cfc]/50 transition-colors backdrop-blur-md">
            <span className="relative z-10 text-xs font-bold uppercase tracking-[0.15em] text-white">
              Get Started
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-[#7c5cfc] to-[#ff2d55] opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section 
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative pt-40 pb-20 px-6 max-w-6xl mx-auto w-full flex flex-col items-center text-center z-10 min-h-screen"
      >


        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="mb-16 mt-8 relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-[#7c5cfc]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 rounded-[3rem] blur-xl" />
          <div className="p-16 md:p-24 rounded-[3rem] bg-[#0a0a0f]/80 border border-white/[0.08] shadow-[0_0_100px_-20px_rgba(124,92,252,0.2)] backdrop-blur-2xl relative overflow-hidden flex flex-col items-center justify-center transition-transform duration-700 hover:scale-[1.02]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <FascaLogo 
              showWordmark={true} 
              size={120} 
              layout="vertical" 
              wordmarkClassName="font-serif font-bold tracking-[0.25em] text-white leading-none mt-10 text-5xl md:text-6xl lg:text-7xl" 
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-col items-center gap-6"
        >
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link href="/auth" className="group relative inline-flex items-center justify-center px-10 py-5 bg-white text-black rounded-full font-semibold text-sm hover:scale-105 transition-transform duration-300">
              Initiate System
              <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="flex items-center bg-[#0a0a0f] border border-white/20 rounded-full overflow-hidden hover:border-[#7c5cfc] transition-colors duration-300">
              <a href="/FascaMobile.apk" download className="px-6 py-5 text-white font-semibold text-sm hover:bg-[#7c5cfc]/10 transition-colors">
                Download Android App
              </a>
              <div className="w-px h-8 bg-white/20" />
              <button onClick={() => setShowQR(!showQR)} className="px-6 py-5 text-[#a0a0a0] hover:text-white hover:bg-[#7c5cfc]/10 transition-colors">
                Scan QR
              </button>
            </div>
          </div>

          {showQR && (
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="p-4 rounded-2xl bg-white shadow-[0_0_40px_rgba(124,92,252,0.3)] mt-2"
            >
              <div className="bg-white p-2 rounded-xl">
                <QRCode 
                  value="https://frontend-fasca-os.vercel.app/FascaMobile.apk" 
                  size={160}
                  level="Q"
                />
              </div>
              <p className="text-black/60 text-xs mt-3 font-semibold text-center">Scan to download</p>
            </motion.div>
          )}
        </motion.div>

        {/* Floating Dashboard Mockup */}
        <motion.div
          initial={{ y: 100, opacity: 0, rotateX: 20 }}
          animate={{ y: 0, opacity: 1, rotateX: 0 }}
          transition={{ delay: 0.8, duration: 1.2, type: "spring", stiffness: 50 }}
          className="mt-20 w-full max-w-5xl rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(124,92,252,0.2)]"
          style={{ perspective: "1000px" }}
        >
          <img src="/hero-dashboard.png" alt="Dashboard Mockup" className="w-full h-auto object-cover" />
        </motion.div>
      </motion.section>

      {/* Magnificent Feature Showcase */}
      <section className="relative w-full max-w-7xl mx-auto px-6 py-32 z-10 flex flex-col gap-32">
        
        {/* Feature 1 */}
        <div className="flex flex-col md:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2 space-y-6"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <MonitorPlay className="w-6 h-6 text-[#ff2d55]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Focus Rooms. <br/><span className="text-[#8e8e93]">Synchronized.</span></h2>
            <p className="text-lg text-[#8e8e93] leading-relaxed">
              Step into immersive, dark academia environments. Sync YouTube study playlists with friends in real-time, completely ad-free. Block distractions and achieve ultimate flow.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2"
          >
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-[#ff2d55]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
              <img src="/focus-room.png" alt="Focus Room" className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700" />
            </div>
          </motion.div>
        </div>

        {/* Feature 2 */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2 space-y-6"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <BrainCircuit className="w-6 h-6 text-[#7c5cfc]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">AI Cores. <br/><span className="text-[#8e8e93]">Elevated intelligence.</span></h2>
            <p className="text-lg text-[#8e8e93] leading-relaxed">
              Connect your own API keys for Claude or GPT. Experience a hyper-intelligent tutor directly integrated into your workspace, ready to dissect complex theorems or brainstorm essays.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2"
          >
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
              <div className="absolute inset-0 bg-gradient-to-tl from-[#7c5cfc]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
              <img src="/ai-tutor.png" alt="AI Tutor" className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700" />
            </div>
          </motion.div>
        </div>

        {/* Feature 3 */}
        <div className="flex flex-col md:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2 space-y-6"
          >
            <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">The Vault. <br/><span className="text-[#8e8e93]">Encrypted cloud.</span></h2>
            <p className="text-lg text-[#8e8e93] leading-relaxed">
              Store your PDFs, assignments, and secrets in a fully encrypted private cloud. Lightning fast, flawlessly secure, and always accessible from your command center.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="w-full md:w-1/2"
          >
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10" />
              <img src="/secure-cloud.png" alt="Secure Vault" className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-700" />
            </div>
          </motion.div>
        </div>

      </section>

      {/* Footer CTA */}
      <section className="w-full border-t border-white/5 bg-[#0a0a0f] py-32 z-10 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">Ready to upgrade your workflow?</h2>
          <Link href="/auth?tab=register" className="inline-flex items-center justify-center px-12 py-5 bg-[#7c5cfc] hover:bg-[#6b4ce6] text-white rounded-full font-bold uppercase tracking-wider transition-colors shadow-[0_0_30px_rgba(124,92,252,0.4)]">
            Create Free Account
          </Link>
        </div>
      </section>

    </div>
  );
}
