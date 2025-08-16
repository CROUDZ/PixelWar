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
        text: "var(--text)",
        muted: "var(--muted)",
        glass: "var(--glass)",
      },
    },
  },
  plugins: [],
};

export default config;
