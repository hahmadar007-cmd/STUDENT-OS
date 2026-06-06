import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { FouzarProvider } from "../lib/FouzarContext";
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

export const metadata: Metadata = {
  title: "Fouzar | High-Performance Study Engine",
  description: "Futuristic digital garden and contextual focus room for high-performance SaaS builders.",
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
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-fouzar-bg text-fouzar-text-primary antialiased select-none">
        <FouzarProvider>
          {children}
          <CommandPalette />
          <ToastContainer />
        </FouzarProvider>
      </body>
    </html>
  );
}


