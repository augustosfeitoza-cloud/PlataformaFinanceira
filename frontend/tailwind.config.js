/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefdf6",
          100: "#d5f8e7",
          200: "#aef0d1",
          300: "#77e2b4",
          400: "#3ecb93",
          500: "#18b077",
          600: "#0f8f61",
          700: "#0f7250",
          800: "#115b42",
          900: "#0f4b38",
        },
      },
    },
  },
  plugins: [],
};
