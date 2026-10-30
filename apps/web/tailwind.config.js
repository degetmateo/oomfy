/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8fdf2',
          100: '#c5f9de',
          200: '#90f3c0',
          300: '#50e99d',
          400: '#1fd97e',
          500: '#00dc65', // PRUEBA 2 pixel green
          600: '#00bd54',
          700: '#009444',
          800: '#037438',
          900: '#045f30',
        },
        dark: {
          bg: '#141414', // FONDO NUEVO
          card: '#1b1b1b',
          border: '#2a2a2a',
          input: '#121212',
          text: '#eaeaea',
          muted: '#8e8e8e',
        },
      },
      fontFamily: {
        mono: ['JetBrainsMono', 'monospace', 'Courier New'],
        pixel: ['JetBrainsMono', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        pixel: '2px 2px 0px 0px rgba(0, 0, 0, 0.6)',
        'pixel-brand': '2px 2px 0px 0px #009444',
      },
    },
  },
  plugins: [],
};
