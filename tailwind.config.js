/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:  '#FFF8EC',
        milk:   '#FDFBF5',
        gold:   { 50:'#FFF8E1', 400:'#E8B24A', 600:'#B8862B', 700:'#8A6420' },
        leaf:   { 500:'#4A7C59', 700:'#2F5235' },
        ink:    '#1B1A17',
      },
      fontFamily: {
        ta:   ['"Noto Sans Tamil"','sans-serif'],
        display: ['"Fraunces"','serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(27,26,23,0.06), 0 1px 2px rgba(27,26,23,0.04)',
      },
    },
  },
  plugins: [],
};
