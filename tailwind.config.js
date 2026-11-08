/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./client/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Fira Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        theme: {
          black: '#000000',
          darker: '#09090b',
          dark: '#121215',
          card: '#18181b',
          border: '#27272a',
          muted: '#71717a',
          light: '#e4e4e7',
          white: '#ffffff'
        },
        status: {
          success: '#10b981', // emerald-500 (dobre odpowiedzi, zachowane szanse)
          warning: '#f59e0b', // amber-500 (czas < 5s, 1 szansa)
          danger: '#ef4444',  // red-500 (błędy, koniec czasu, odpadnięcie)
          active: '#00e5ff',  // cyan/neon (aktywny gracz, wyznaczenie)
        }
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow 1.5s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 255, 255, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 255, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
