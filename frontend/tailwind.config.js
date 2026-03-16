/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F0',
        warm: '#FFF1E6',
        peach: '#FFE0CC',
        coral: '#FF6B6B',
        sunny: '#FFD93D',
        mint: '#6BCB77',
        sky: '#4D96FF',
        purple: '#9B59B6',
        ink: '#2D3436',
        subtle: '#636E72',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['IBM Plex Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
