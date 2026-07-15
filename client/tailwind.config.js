export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Noto Nastaliq Urdu', 'Noto Sans Arabic', 'system-ui', 'sans-serif']
      },
      colors: {
        mithai: {
          50: '#fff7ed',
          500: '#f97316',
          700: '#c2410c'
        },
        rosewood: '#7f1d1d'
      }
    }
  },
  plugins: []
};
