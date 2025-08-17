import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{ts,tsx,js,jsx}", // Pages et layouts Next.js
    "./src/components/**/*.{ts,tsx,js,jsx}", // Composants React
  ],
  darkMode: "class",
  theme: {
    extend: {
      screens: {
        "2xs": "320px",
        xs: "480px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        accent: "var(--accent)",
        "accent-600": "var(--accent-600)",
        "accent-700": "var(--accent-700)",
        text: "var(--text)",
        "text-secondary": "var(--text-secondary)",
        muted: "var(--muted)",
        border: "var(--border)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        glass: "var(--glass)",
        "glass-hover": "var(--glass-hover)",
        shadow: "var(--shadow)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
