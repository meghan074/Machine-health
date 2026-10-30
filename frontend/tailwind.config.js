/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#060911',
          900: '#0b0f19',
          850: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569'
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2'
        },
        indigo: {
          500: '#6366f1',
          600: '#4f46e5'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'cyan-glow': '0 0 20px -3px rgba(6, 182, 212, 0.35)',
        'cyan-glow-lg': '0 0 35px -5px rgba(6, 182, 212, 0.5)',
        'indigo-glow': '0 0 20px -3px rgba(99, 102, 241, 0.35)',
        'rose-glow': '0 0 20px -3px rgba(244, 63, 94, 0.4)',
        'card-hover': '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 15px 0 rgba(6, 182, 212, 0.15)'
      }
    },
  },
  plugins: [],
}
