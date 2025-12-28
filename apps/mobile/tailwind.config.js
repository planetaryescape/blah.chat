/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#fafafa",
        primary: {
          DEFAULT: "#fafafa",
          foreground: "#0a0a0a",
        },
        secondary: {
          DEFAULT: "#262626",
          foreground: "#fafafa",
        },
        muted: {
          DEFAULT: "#262626",
          foreground: "#a1a1aa",
        },
        accent: {
          DEFAULT: "#262626",
          foreground: "#fafafa",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#fafafa",
        },
        border: "#262626",
        input: "#262626",
        ring: "#d4d4d8",
      },
    },
  },
  plugins: [],
};
