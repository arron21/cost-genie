/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        'theme-bg': 'var(--bg-primary)',
        'theme-bg-secondary': 'var(--bg-secondary)',
        'theme-text': 'var(--text-primary)',
        'theme-text-secondary': 'var(--text-secondary)',
        'theme-border': 'var(--border-color)',
        'theme-accent': 'var(--accent-color)',
        'theme-accent-hover': 'var(--accent-hover)',
      },
    },
  },
  plugins: [],
}

