export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
      },
      colors: {
        primary: '#8b5cf6',
        secondary: '#ec4899',
        accent: '#22d3ee',
        ink: {
          900: '#0a0a1a',
          800: '#12122b',
          700: '#1b1b3a',
        },
      },
      boxShadow: {
        // Layered, dimensional shadows for floating glass panels.
        glass: '0 10px 30px -10px rgba(0,0,0,0.6), 0 1px 0 0 rgba(255,255,255,0.06) inset',
        lift: '0 24px 60px -20px rgba(124,58,237,0.45), 0 8px 24px -12px rgba(0,0,0,0.6)',
        glow: '0 0 0 1px rgba(139,92,246,0.4), 0 0 28px -4px rgba(139,92,246,0.55)',
        'glow-pink': '0 0 0 1px rgba(236,72,153,0.4), 0 0 28px -4px rgba(236,72,153,0.55)',
        inset: 'inset 0 2px 8px rgba(0,0,0,0.45), inset 0 -1px 0 rgba(255,255,255,0.05)',
      },
      backgroundImage: {
        'aurora': 'radial-gradient(1200px 600px at 10% -10%, rgba(139,92,246,0.25), transparent 60%), radial-gradient(1000px 500px at 90% 10%, rgba(236,72,153,0.20), transparent 55%), radial-gradient(900px 600px at 50% 120%, rgba(34,211,238,0.18), transparent 60%)',
        'sheen': 'linear-gradient(135deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 40%, transparent 70%)',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0) translateX(0) scale(1)' },
          '50%': { transform: 'translateY(-30px) translateX(20px) scale(1.05)' },
        },
        floatSlow: {
          '0%,100%': { transform: 'translateY(0) translateX(0) scale(1)' },
          '50%': { transform: 'translateY(40px) translateX(-25px) scale(1.08)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { opacity: '0' },
        },
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        float: 'float 14s ease-in-out infinite',
        'float-slow': 'floatSlow 20s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        'pulse-ring': 'pulseRing 1.8s cubic-bezier(0.2,0.6,0.3,1) infinite',
        'rise-in': 'riseIn 0.5s cubic-bezier(0.2,0.7,0.2,1) both',
      },
    },
  },
  plugins: [],
}
