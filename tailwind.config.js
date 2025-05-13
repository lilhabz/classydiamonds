/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    "scroll-snap-x",
    "scroll-snap-start",
    "hidden-scroll-snap-include",
  ],
  theme: {
    extend: {
      colors: {
        classy: {
          DEFAULT: "#1f2a44",
          light: "#2a374f",
        },
      },
      animation: {
        "slide-fade-in": "slideFadeIn 0.4s ease-out forwards",
      },
      keyframes: {
        slideFadeIn: {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
