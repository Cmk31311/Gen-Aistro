
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
          1: '#131316',
          2: '#1C1C20',
          3: '#252529',
        },
        border: {
          DEFAULT: '#2A2A2E',
          hover: '#3A3A40',
          active: '#4A4A52',
        },
        content: {
          1: '#FAFAF9',
          2: '#D6D3D1',
          3: '#87837E',
        },
        accent: {
          DEFAULT: '#F0C05A',
          hover: '#F5D280',
          dim: '#B8923E',
          muted: 'rgba(240,192,90,0.15)',
        },
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        'card-hover': '0 8px 32px rgba(240,192,90,0.08), 0 2px 8px rgba(0,0,0,0.3)',
        'glow': '0 0 24px rgba(240,192,90,0.1)',
        'glow-lg': '0 0 40px rgba(240,192,90,0.12)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
}
