/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#1e1e1e',
          panel: '#252526',
          border: '#3e3e42',
          hover: '#2a2d2e',
        },
        accent: {
          yellow: '#dcdcaa',
          red: '#f48771',
        },
      },
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
