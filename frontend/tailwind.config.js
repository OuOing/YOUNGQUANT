/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-deep': '#020617',
        'bg-main': '#0f172a',
        'bg-card': '#1e293b',
        'primary': '#2dd4bf',
        'secondary': '#818cf8',
        'accent': '#f472b6',
        'text-main': '#f8fafc',
        'text-muted': '#94a3b8',
        'text-dim': '#64748b',
        'up': '#10b981',
        'down': '#ef4444',
      },
      fontFamily: {
        brand: ['Outfit', 'sans-serif'],
        main: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
