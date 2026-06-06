/**
 * Fasca Design System Tokens
 * 
 * Exports the complete design tokens for the Fasca dark professional study platform.
 * Adheres strictly to the dark color palette, 6px max border radius, and 150-200ms transitions.
 */

export const tokens = {
  colors: {
    background: '#0a0a0f',
    surfaces: {
      default: '#111118',
      card: '#16161f',
      highlight: '#1e1e2a',
    },
    accent: {
      violet: '#7c5cfc',
      violetGlow: 'rgba(124, 92, 252, 0.15)',
      cyan: '#00d4ff',
      crimson: '#ff2d55',
    },
    text: {
      primary: '#f0f0ff',
      secondary: '#6b6b8a',
    },
    border: '#2a2a3a',
  },
  
  typography: {
    families: {
      sans: 'var(--font-sans), Inter, sans-serif',
      serif: 'var(--font-serif), Space Grotesk, sans-serif',
      mono: 'var(--font-mono), JetBrains Mono, monospace',
    },
    sizes: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    weights: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    letterSpacing: {
      tighter: '-0.05em',
      tight: '-0.025em',
      normal: '0em',
      wide: '0.05em',
      wider: '0.1em',
      widest: '0.2em',
    }
  },

  spacing: {
    px: '1px',
    0: '0px',
    1: '0.25rem',  // 4px
    2: '0.5rem',   // 8px
    3: '0.75rem',  // 12px
    4: '1rem',     // 16px
    5: '1.25rem',  // 20px
    6: '1.5rem',   // 24px
    8: '2rem',     // 32px
    10: '2.5rem',  // 40px
    12: '3rem',    // 48px
    16: '4rem',    // 64px
  },

  borderRadius: {
    none: '0px',
    sm: '2px',
    default: '4px',
    md: '6px', // Maximum 6px border radius
  },

  shadows: {
    card: '0 4px 20px rgba(124, 92, 252, 0.08)',
    button: '0 2px 8px rgba(124, 92, 252, 0.2)',
    input: 'inset 0 1px 2px rgba(0, 0, 0, 0.2)',
    glow: '0 0 12px rgba(124, 92, 252, 0.3)',
    glowCrimson: '0 0 12px rgba(255, 45, 85, 0.3)',
  },

  transitions: {
    default: 'all 150ms ease-out',
    slow: 'all 200ms ease-out',
  }
} as const;
