/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  future: {
    hoverOnlyWhenSupported: true, // hover: styles only fire on real pointer devices, not touch
  },
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
      colors: {
        tp: {
          // Dark theme
          bg:        '#111111',
          card:      '#1c1c1e',
          border:    '#2c2c2e',
          // Light theme
          'bg-l':    '#f2f2f7',
          'card-l':  '#ffffff',
          'border-l':'#e5e5ea',
          // Text
          text:      '#ffffff',
          sub:       '#8e8e93',
          muted:     '#48484a',
          'text-l':  '#1c1c1e',
          'sub-l':   '#6c6c70',
          // Semantic
          green:     '#00b15d',
          'green-bg':'rgba(0,177,93,0.12)',
          red:       '#ff3b30',
          'red-bg':  'rgba(255,59,48,0.12)',
          blue:      '#007aff',
        },
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: 0 },                        '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
