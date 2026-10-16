export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#071B33', 900: '#0B2E52', 800: '#0B6BB5', 700: '#1380D6' },
        signal: { 400: '#FFA866', 500: '#FF914D', 600: '#E57A36' },
        paper: '#EEF3F8',
      },
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"Public Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};