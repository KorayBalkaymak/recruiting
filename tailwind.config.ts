import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#32CFDC",
          hover: "#108A9C",
          light: "#E7FAFC",
          bright: "#52E0DB",
          deep: "#108A9C",
        },
        navy: {
          DEFAULT: "#0F1D2C",
          deep: "#0A111B",
          lift: "#142B3D",
        },
        sidebar: {
          DEFAULT: "#0F1D2C",
          hover: "#142B3D",
          border: "#1A2E40",
          foreground: "#FFFFFF",
          muted: "#8A96A3",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#FAFBFC",
          border: "#E8EDF1",
        },
        ink: {
          DEFAULT: "#202B38",
          muted: "#626D78",
        },
        status: {
          new: "#32CFDC",
          progress: "#108A9C",
          done: "#16A34A",
          inactive: "#8A96A3",
          danger: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 29, 44, 0.06), 0 1px 0 rgba(15, 29, 44, 0.04)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
