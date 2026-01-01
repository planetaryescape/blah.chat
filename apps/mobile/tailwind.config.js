/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0c0a14", // Void
        foreground: "#fafafa", // Starlight

        primary: {
          DEFAULT: "#F4E0DC", // Rose Quartz
          foreground: "#0c0a14", // Void
        },
        secondary: {
          DEFAULT: "#1a1625", // Nebula
          foreground: "#fafafa",
        },
        muted: {
          DEFAULT: "#1a1625", // Nebula
          foreground: "rgba(250, 250, 250, 0.6)", // Starlight Dim
        },
        accent: {
          DEFAULT: "rgba(255, 255, 255, 0.05)", // Glass Low
          foreground: "#fafafa",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#fafafa",
        },
        border: "rgba(255, 255, 255, 0.08)", // Glass Border
        input: "rgba(255, 255, 255, 0.05)", // Glass Low
        ring: "#F4E0DC",
      },
      fontFamily: {
        display: ["Syne_700Bold"],
        heading: ["Syne_600SemiBold"],
        body: ["Manrope_400Regular"],
        medium: ["Manrope_500Medium"],
        bold: ["Manrope_700Bold"],
      },
    },
  },
  plugins: [],
};
