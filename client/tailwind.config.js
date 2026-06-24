/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cyber': {
          dark: '#0A0E27',
          panel: '#0D1117',
          border: '#1A1F3A',
          cyan: '#00FFFF',
          purple: '#7C3AED',
          green: '#22C55E',
          pink: '#FF006E',
          amber: '#F59E0B',
        },
        'hud': {
          line: '#1E2A4A',
          text: '#E0E0E0',
          dim: '#64748B',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'radar-spin': 'radar-spin 4s linear infinite',
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
        'scan-line': 'scan-line 2s linear infinite',
        'signal-pulse': 'signal-pulse 1.5s ease-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        'radar-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'pulse-neon': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 10px rgba(0,255,255,0.3)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 20px rgba(0,255,255,0.6)' }
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        'signal-pulse': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' }
        },
        'glow': {
          '0%': { textShadow: '0 0 4px rgba(0,255,255,0.5)' },
          '100%': { textShadow: '0 0 12px rgba(0,255,255,0.9), 0 0 24px rgba(124,58,237,0.5)' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        }
      }
    },
  },
  plugins: [],
};
