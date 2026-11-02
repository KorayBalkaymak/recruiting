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
        // Markenfarben laut Vorgabe
        brand: {
          DEFAULT: "#FF5500",
          hover: "#E64A00",
          light: "#FFEDE3",
        },
        sidebar: {
          DEFAULT: "#1E1E1E",
          hover: "#2A2A2A",
          border: "#333333",
          foreground: "#E5E5E5",
          muted: "#9A9A9A",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F8FAFC",
          border: "#E7EAEE",
        },
        ink: {
          DEFAULT: "#16181D",
          muted: "#5B616E",
        },
        status: {
          new: "#2563EB",
          progress: "#D97706",
          done: "#16A34A",
          inactive: "#94A3B8",
          danger: "#DC2626",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        panel: "0 1px 2px rgba(16, 20, 28, 0.06), 0 1px 0 rgba(16, 20, 28, 0.04)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
