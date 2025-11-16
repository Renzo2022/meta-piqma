/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'monokai-dark': '#272822',
        'monokai-bg': '#1e1f1c',
        'monokai-sidebar': '#2D2A2E',
        'monokai-pink': '#FF6188',
        'monokai-green': '#A9DC76',
        'monokai-yellow': '#FFD866',
        'monokai-blue': '#78DCE8',
        'monokai-purple': '#AB9DF2',
        'monokai-orange': '#FC9867',
        'monokai-text': '#F8F8F2',
        'monokai-subtle': '#75715E',
      },
      boxShadow: {
        'monokai-pink': '0 0 20px rgba(255, 97, 136, 0.3)',
        'monokai-blue': '0 0 20px rgba(120, 220, 232, 0.3)',
        'monokai-purple': '0 0 20px rgba(171, 157, 242, 0.3)',
      }
    }
  },
  plugins: [],
}
