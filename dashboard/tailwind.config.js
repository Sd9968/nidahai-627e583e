/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#f7f4ef",
          100: "#ece5d8",
          200: "#d9c9ae",
          800: "#4a3f32",
          900: "#2c261e",
        },
        oasis: {
          500: "#0d7377",
          600: "#095c5f",
          700: "#074649",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
