// ============================================================================
// Copyright (c) 2025 hahmadar007-cmd. All Rights Reserved.
// STUDENT-OS — Proprietary & Confidential Software.
// Unauthorized copying, modification, distribution, or use of this file,
// via any medium, is strictly prohibited and punishable by law.
// See LICENSE file for full legal terms and penalties.
// ============================================================================

import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono, UnifrakturMaguntia } from "next/font/google";
import "./globals.css";
import { FouzarProvider } from "../lib/FouzarContext";
import { ThemeProvider } from "../lib/ThemeContext";
import { CommandPalette } from "../components/ui/CommandPalette";
import { ToastContainer } from "../components/ui/Toast";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-serif", // Map to --font-serif so tailwind can use it as header font
  subsets: ["latin"],
  weight: ["700", "500"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const grenzeGotisch = UnifrakturMaguntia({
  variable: "--font-gothic",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Fouzar | High-Performance Study Engine",
  description: "Fouzar is a high-performance student OS with Pomodoro, Diary, and AI tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="onyx"
      data-space="planning"
      data-flow="idle"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrains.variable} ${grenzeGotisch.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-fouzar-bg text-fouzar-text-primary antialiased select-none">
        <FouzarProvider>
          <ThemeProvider>
            {children}
            <CommandPalette />
            <ToastContainer />
          </ThemeProvider>
        </FouzarProvider>
      </body>
    </html>
  );
}


