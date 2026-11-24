/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#F3F5FA',
        surface: '#FFFFFF',
        ink: {
          DEFAULT: '#17182B',
          muted: '#6B7280',
          light: '#9CA3AF',
        },
        primary: {
          DEFAULT: '#7064E8',
          hover: '#5E51E2',
          light: '#EEF2FF',
          dark: '#4839C2',
        },
        success: {
          DEFAULT: '#15966A',
          light: '#E8F8F2',
        },
        warning: {
          DEFAULT: '#B97816',
          light: '#FEF6E7',
        },
        sidebar: '#17182B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [],
};
