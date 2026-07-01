/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          950: '#0d0d14',
          900: '#13131b',
          850: '#1a1a24',
          800: '#21212e',
          750: '#2a2a38',
          700: '#323244',
          600: '#4a4a5a',
          500: '#6b6b7b',
          400: '#9ca3af',
          300: '#cbd5e1',
          200: '#e2e8f0',
          100: '#f1f5f9',
        },
      },
    },
  },
  plugins: [],
};
