
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./ui/**/*.{js,jsx}",
    "./context/**/*.{js,jsx}",
    "./hooks/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: '#09090B',
        surface: {
          1: '#111113',
          2: '#1A1A1D',
          3: '#232326',
        },
        border: {
          DEFAULT: '#262629',
          hover: '#333338',
          active: '#444449',
        },
        content: {
          1: '#FAFAF9',
          2: '#A8A29E',
          3: '#78716C',
        },
        accent: {
          DEFAULT: '#D4A853',
          hover: '#E2BD6E',
          muted: 'rgba(212,168,83,0.12)',
        },
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
        'glow': '0 0 20px rgba(212,168,83,0.08)',
      },
    },
  },
  plugins: [],
}
