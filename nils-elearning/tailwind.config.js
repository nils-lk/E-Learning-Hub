/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nilsBlue: {
          DEFAULT: '#1a3a6b',
          50:  '#e8eef8',
          100: '#c5d3ee',
          200: '#9fb6e2',
          300: '#7899d6',
          400: '#5a82ce',
          500: '#3c6bc5',
          600: '#2e5ab0',
          700: '#1f4696',
          800: '#1a3a6b',
          900: '#102444',
        },
        nilsGold: {
          DEFAULT: '#c9a227',
          50:  '#fdf8e7',
          100: '#f9efc3',
          200: '#f4e49a',
          300: '#efd971',
          400: '#e9ce50',
          500: '#e4c32f',
          600: '#c9a227',
          700: '#a07e1f',
          800: '#785e17',
          900: '#503e0f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
