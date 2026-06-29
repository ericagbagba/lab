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
        brand: {
          light: '#e8f0fb',
          DEFAULT: '#1a56a0',
          dark: '#0f172a',
          border: '#dce6f0',
        },
        success: '#16a34a',
        danger: '#ef4444',
        warning: '#b45309',
        warningBg: '#fef9c3',
        violetSec: '#7c3aed',
      }
    },
  },
  plugins: [],
}
