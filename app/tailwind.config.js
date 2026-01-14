/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bagel-orange': '#FF6B35',
        'bagel-cream': '#F7F7F2',
        'bagel-dark': '#2D2D2A',
        'bagel-sesame': '#FFD23F',
      },
    },
  },
  plugins: [],
}
