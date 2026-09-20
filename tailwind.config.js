/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mac: {
          bg: 'var(--mac-bg)',
          card: 'var(--mac-card)',
          border: 'var(--mac-border)',
          accent: '#007AFF',
          accentHover: '#0062CC',
        }
      }
    },
  },
  plugins: [],
}
