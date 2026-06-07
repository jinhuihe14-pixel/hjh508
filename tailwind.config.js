/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdedd3',
          200: '#fad7a5',
          300: '#f6ba6d',
          400: '#f19333',
          500: '#ee7612',
          600: '#df5b08',
          700: '#b94309',
          800: '#93360f',
          900: '#772e0f',
        },
        wine: {
          50: '#fdf3f3',
          100: '#fce4e4',
          200: '#f9cccc',
          300: '#f4a7a7',
          400: '#ec7373',
          500: '#e14d4d',
          600: '#cd3030',
          700: '#ac2424',
          800: '#8f2121',
          900: '#772121',
        }
      }
    },
  },
  plugins: [],
}
