import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f7f5",
          100: "#e8ede9",
          200: "#cfd9d2",
          300: "#a3b3a8",
          400: "#778a7e",
          500: "#566a5f",
          600: "#3f5249",
          700: "#2c3d35",
          800: "#1c2a25",
          900: "#0e1814",
          950: "#070d0a",
        },
        // PRIMARY — deep charity green, golf-course-at-dusk.
        // Anti-cliché: not kelly green, not bright; muted/sophisticated.
        brand: {
          50: "#eef6f0",
          100: "#d4ead9",
          200: "#abd4b5",
          300: "#7bb88c",
          400: "#519968",
          500: "#357d4d",   // primary
          600: "#27613c",
          700: "#1f4d31",
          800: "#193e28",
          900: "#143221",
          950: "#0a1c12",
        },
        // ACCENT — warm trophy gold for prizes, wins, success states.
        accent: {
          50: "#fdf8e7",
          100: "#fcefc4",
          200: "#f8de89",
          300: "#f3c84c",
          400: "#edae1f",
          500: "#d28e0c",   // warm gold
          600: "#a76a07",
          700: "#84510a",
          800: "#6c410f",
          900: "#5b3712",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(53, 125, 77, 0.25), 0 20px 60px -25px rgba(53, 125, 77, 0.45)",
        card: "0 1px 2px rgba(14, 24, 20, 0.04), 0 10px 30px -15px rgba(14, 24, 20, 0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.94)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "gradient-shift": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.8" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        "fade-up-200": "fade-up 0.6s 0.08s ease-out both",
        "fade-up-300": "fade-up 0.6s 0.16s ease-out both",
        "fade-up-400": "fade-up 0.6s 0.24s ease-out both",
        "fade-up-500": "fade-up 0.6s 0.32s ease-out both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.4s ease-out both",
        shimmer: "shimmer 2.5s linear infinite",
        float: "float 4s ease-in-out infinite",
        "gradient-shift": "gradient-shift 8s ease infinite",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
