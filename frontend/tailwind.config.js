/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172d3a",
        muted: "#6b7b83",
        brand: "#174e55",
        accent: "#d8a878",
        canvas: "#f6f7f5",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["DM Serif Display", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 16px 48px rgba(23, 45, 58, 0.09)",
      },
    },
  },
  plugins: [],
}; 
