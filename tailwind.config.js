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
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: '#050505', // Deep absolute dark
        surface: {
          1: '#0A0A0A',
          2: '#121212',
          3: '#1A1A1A',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          hover: 'rgba(255, 255, 255, 0.12)',
          active: 'rgba(255, 255, 255, 0.2)',
        },
        content: {
          1: '#FFFFFF',
          2: '#A1A1AA', // Zinc 400
          3: '#71717A', // Zinc 500
        },
        accent: {
          DEFAULT: '#E5A93D', // Premium warm gold
          hover: '#FCD34D', // Lighter gold via Amber 300
          dim: '#B45309', // Darker rich amber
          muted: 'rgba(229, 169, 61, 0.1)',
        },
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'glass-hover': '0 8px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass-active': '0 2px 20px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.02)',
        'glow-accent': '0 0 20px rgba(229, 169, 61, 0.15), inset 0 0 0 1px rgba(229, 169, 61, 0.2)',
        'glow-subtle': '0 0 15px rgba(255, 255, 255, 0.03)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'accent-gradient': 'linear-gradient(135deg, #E5A93D 0%, #D97706 100%)',
      },
    },
  },
  plugins: [],
}
