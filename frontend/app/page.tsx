'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { FascaLogo } from '../components/logo/FascaLogo';

interface BentoCardProps {
  title: string;
  subtitle: string;
  imageSrc: string;
  colSpan?: string;
  rowSpan?: string;
  delay?: number;
}

const BentoCard: React.FC<BentoCardProps> = ({ title, subtitle, imageSrc, colSpan = "col-span-1", rowSpan = "row-span-1", delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    className={`relative overflow-hidden rounded-2xl bg-[#161623] border border-[#2a2a3a] group cursor-pointer ${colSpan} ${rowSpan}`}
  >
    {/* Background Image */}
    <div className="absolute inset-0 w-full h-full">
      <img
        src={imageSrc}
        alt={title}
        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-in-out"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent pointer-events-none" />
    </div>

    {/* Content overlay */}
    <div className="absolute bottom-0 left-0 w-full p-6 sm:p-8 flex flex-col justify-end">
      <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
        {title}
      </h3>
      <p className="text-xs sm:text-sm font-mono tracking-widest text-[#b582ff] uppercase opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        {subtitle}
      </p>
    </div>
  </motion.div>
);

export default function LandingPage() {
  const scrollToFeatures = () => {
    document.getElementById('bento-features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen relative select-none bg-[#0a0a0f] text-[#d1d1d6] font-sans antialiased overflow-x-hidden selection:bg-[#7c5cfc] selection:text-white">
      
      {/* Mystical dark background grid & gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1a1a24_1px,transparent_1px),linear-gradient(to_bottom,#1a1a24_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#7c5cfc] rounded-full blur-[150px] opacity-10 mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#ff2d55] rounded-full blur-[150px] opacity-5 mix-blend-screen" />
      </div>

      {/* Navigation Bar */}
      <nav className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <Link href="/" className="cursor-pointer">
          <FascaLogo showWordmark={true} size={30} layout="horizontal" />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/auth?tab=login" className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8e8e93] hover:text-white transition-colors duration-300">
            Sign In
          </Link>
          <Link href="/auth?tab=register" className="relative group px-5 py-2 overflow-hidden rounded-md border border-[#7c5cfc]/50 hover:border-[#7c5cfc]">
            <div className="absolute inset-0 bg-[#7c5cfc] opacity-10 group-hover:opacity-20 transition-opacity duration-300" />
            <span className="relative text-[10px] font-mono uppercase tracking-[0.2em] font-bold text-[#b582ff] group-hover:text-white transition-colors duration-300">
              Enter OS
            </span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto px-6 z-10 relative pt-20 pb-16 text-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, filter: 'blur(10px)' }}
          animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <FascaLogo showWordmark={false} size={70} />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1] mb-6"
        >
          The <span className="font-serif text-[#b582ff] font-normal text-5xl md:text-7xl lg:text-8xl italic pr-2">Ultimate</span> OS <br /> for Students.
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-[#8e8e93] text-sm md:text-base font-light max-w-2xl leading-relaxed mb-10"
        >
          Unlock your dark academia potential. Secret diaries, immersive focus rooms, synchronized YouTube watch parties, AI tutors, and encrypted cloud storage—all in one premium digital workspace.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <Link href="/auth" className="relative group p-[1px] bg-transparent rounded-lg overflow-hidden cursor-pointer active:scale-95 transition-transform duration-200 block w-full sm:w-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-[#7c5cfc] via-[#ff2d55] to-[#7c5cfc] opacity-70 group-hover:opacity-100 blur-[2px] transition-opacity duration-300" />
            <div className="relative px-12 py-4 bg-[#0a0a0f] group-hover:bg-transparent transition-colors duration-300 rounded-lg flex items-center justify-center">
              <span className="text-[11px] font-mono font-bold uppercase tracking-[0.25em] text-white group-hover:text-black">
                INITIATE SYSTEM
              </span>
            </div>
          </Link>
          
          <button 
            onClick={scrollToFeatures}
            className="flex items-center gap-2 px-8 py-4 text-[10px] font-mono uppercase tracking-[0.2em] text-[#8e8e93] hover:text-white transition-colors duration-300 cursor-pointer"
          >
            Explore <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          </button>
        </motion.div>
      </main>

      {/* Bento Grid Feature Showcase */}
      <section id="bento-features" className="w-full max-w-7xl mx-auto px-6 py-20 z-10 relative">
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">Core Protocols</h2>
          <div className="w-12 h-1 bg-gradient-to-r from-[#7c5cfc] to-transparent rounded-full" />
        </motion.div>

        {/* The Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 auto-rows-[250px] gap-4 md:gap-6">
          
          {/* Box 1: Focus Room */}
          <BentoCard 
            title="Focus Room & YouTube"
            subtitle="Sync videos. Defeat distractions."
            imageSrc="/focus-room.png"
            colSpan="col-span-1 md:col-span-2 lg:col-span-2"
            rowSpan="row-span-1 md:row-span-2"
            delay={0.1}
          />

          {/* Box 2: Diary Lockscreen */}
          <BentoCard 
            title="Secret Diary"
            subtitle="Encrypted. Personal. Yours."
            imageSrc="/diary-lockscreen.png"
            colSpan="col-span-1 lg:col-span-1"
            rowSpan="row-span-1"
            delay={0.2}
          />

          {/* Box 3: AI Tutor */}
          <BentoCard 
            title="AI Ecosystem"
            subtitle="Flashcards. Quizzes. Slides."
            imageSrc="/ai-tutor.png"
            colSpan="col-span-1 lg:col-span-1"
            rowSpan="row-span-1 md:row-span-2"
            delay={0.3}
          />

          {/* Box 4: Chat Preview */}
          <BentoCard 
            title="Real-Time Comms"
            subtitle="Study Groups & Direct Chat."
            imageSrc="/chat-preview.png"
            colSpan="col-span-1 lg:col-span-1"
            rowSpan="row-span-1"
            delay={0.4}
          />

          {/* Box 5: AWS Cloud */}
          <BentoCard 
            title="AWS Cloud Drive"
            subtitle="Infinite Storage. Secure."
            imageSrc="/cloud-preview.png"
            colSpan="col-span-1 md:col-span-2 lg:col-span-2"
            rowSpan="row-span-1"
            delay={0.5}
          />

          {/* Box 6: Ledger */}
          <BentoCard 
            title="Academic Ledger"
            subtitle="GPA Tracker & Attendance."
            imageSrc="/ledger-preview.png"
            colSpan="col-span-1 md:col-span-1 lg:col-span-2"
            rowSpan="row-span-1"
            delay={0.6}
          />

        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-[#2a2a3a] py-8 text-center z-10 relative bg-[#0a0a0f]">
        <p className="text-[10px] font-mono text-[#8e8e93] uppercase tracking-[0.2em]">
          &copy; {new Date().getFullYear()} Fasca Student OS. All Systems Nominal.
        </p>
      </footer>
    </div>
  );
}
