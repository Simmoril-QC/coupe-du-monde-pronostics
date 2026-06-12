/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'wc-blue': '#0b3d91',
        'wc-green': '#1e7e34',
        'wc-orange': '#ffb81c',
      },
    },
  },
  plugins: [],
}
