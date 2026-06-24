/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        space: {
          darkest: '#06060B',
          dark: '#0A0A14',
          card: '#111118',
          border: '#1E1E2E',
        },
        accent: {
          primary: '#6366F1',   // indigo
          glow: '#818CF8',      // lighter indigo
          success: '#34D399',   // emerald
          alert: '#F472B6',     // pink
          warm: '#FBBF24',      // amber
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
        'spotlight-left': 'spotlightLeft 2s ease 0.5s 1 forwards',
        'beam-fade': 'beamFade 2.5s ease-out 0.4s 1 forwards',
        'star-shoot': 'starShoot 0.6s ease-out 1 forwards',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        pulseGlow: { '0%,100%': { boxShadow: '0 0 8px rgba(99,102,241,0.15)' }, '50%': { boxShadow: '0 0 20px rgba(99,102,241,0.35)' } },
        shimmer: { '0%': { backgroundPosition: '200% 0' }, '100%': { backgroundPosition: '-200% 0' } },
        borderGlow: { '0%,100%': { borderColor: 'rgba(99,102,241,0.3)' }, '50%': { borderColor: 'rgba(99,102,241,0.6)' } },
        spotlightLeft: { '0%': { opacity: '0', transform: 'translateX(-15%) translateY(-55%) scale(0.5)' }, '100%': { opacity: '1', transform: 'translateX(5%) translateY(-45%) scale(1)' } },
        beamFade: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        starShoot: { '0%': { transform: 'rotate(-25deg) translateY(-20px) translateX(-100%)', opacity: '0' }, '50%': { opacity: '1' }, '100%': { transform: 'rotate(-25deg) translateY(60px) translateX(100%)', opacity: '0' } },
        starFall: { '0%': { transform: 'translateY(-100%)', opacity: '0' }, '10%': { opacity: '1' }, '90%': { opacity: '1' }, '100%': { transform: 'translateY(400%)', opacity: '0' } },
      },
      backgroundImage: {
        'shimmer-gr': 'linear-gradient(90deg, transparent, rgba(99,102,241,0.08), transparent)',
        'gradient-radial': 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 50%)',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
