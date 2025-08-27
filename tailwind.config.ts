import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{ts,tsx,js,jsx}",
    "./src/components/**/*.{ts,tsx,js,jsx}",
    "./src/app/**/*.{ts,tsx,js,jsx}",
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
        "3xl": "1920px",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      colors: {
        // Couleurs principales
        background: {
          DEFAULT: "var(--background)",
          secondary: "var(--background-secondary)",
          50: "color-mix(in srgb, var(--background) 50%, white)",
          100: "color-mix(in srgb, var(--background) 75%, white)",
          200: "color-mix(in srgb, var(--background) 85%, white)",
          300: "color-mix(in srgb, var(--background) 90%, white)",
          400: "color-mix(in srgb, var(--background) 95%, white)",
          500: "var(--background)",
          600: "color-mix(in srgb, var(--background) 90%, black)",
          700: "color-mix(in srgb, var(--background) 80%, black)",
          800: "color-mix(in srgb, var(--background) 70%, black)",
          900: "color-mix(in srgb, var(--background) 60%, black)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          active: "var(--accent-active)",
          50: "color-mix(in srgb, var(--accent) 95%, white)",
          100: "color-mix(in srgb, var(--accent) 90%, white)",
          200: "color-mix(in srgb, var(--accent) 80%, white)",
          300: "color-mix(in srgb, var(--accent) 70%, white)",
          400: "color-mix(in srgb, var(--accent) 60%, white)",
          500: "var(--accent)",
          600: "var(--accent-600)",
          700: "var(--accent-700)",
          800: "var(--accent-800)",
          900: "color-mix(in srgb, var(--accent-800) 80%, black)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          muted: "var(--text-muted)",
          50: "color-mix(in srgb, var(--text-primary) 50%, white)",
          100: "color-mix(in srgb, var(--text-primary) 75%, white)",
          200: "color-mix(in srgb, var(--text-primary) 85%, white)",
          300: "color-mix(in srgb, var(--text-primary) 90%, white)",
          400: "color-mix(in srgb, var(--text-primary) 95%, white)",
          500: "var(--text-primary)",
          600: "color-mix(in srgb, var(--text-primary) 90%, black)",
          700: "color-mix(in srgb, var(--text-primary) 80%, black)",
          800: "color-mix(in srgb, var(--text-primary) 70%, black)",
          900: "color-mix(in srgb, var(--text-primary) 60%, black)",
        },
        surface: {
          primary: "var(--surface-primary)",
          secondary: "var(--surface-secondary)",
          tertiary: "var(--surface-tertiary)",
          hover: "var(--surface-hover)",
          50: "color-mix(in srgb, var(--surface-primary) 95%, white)",
          100: "color-mix(in srgb, var(--surface-primary) 90%, white)",
          200: "color-mix(in srgb, var(--surface-primary) 80%, white)",
          300: "color-mix(in srgb, var(--surface-primary) 70%, white)",
          400: "color-mix(in srgb, var(--surface-primary) 60%, white)",
          500: "var(--surface-primary)",
          600: "color-mix(in srgb, var(--surface-primary) 90%, black)",
          700: "color-mix(in srgb, var(--surface-primary) 80%, black)",
          800: "color-mix(in srgb, var(--surface-primary) 70%, black)",
          900: "color-mix(in srgb, var(--surface-primary) 60%, black)",
        },
        border: {
          primary: "var(--border-primary)",
          secondary: "var(--border-secondary)",
          focus: "var(--border-focus)",
          50: "color-mix(in srgb, var(--border-primary) 50%, white)",
          100: "color-mix(in srgb, var(--border-primary) 75%, white)",
          200: "color-mix(in srgb, var(--border-primary) 85%, white)",
          300: "color-mix(in srgb, var(--border-primary) 90%, white)",
          400: "color-mix(in srgb, var(--border-primary) 95%, white)",
          500: "var(--border-primary)",
          600: "color-mix(in srgb, var(--border-primary) 90%, black)",
          700: "color-mix(in srgb, var(--border-primary) 80%, black)",
          800: "color-mix(in srgb, var(--border-primary) 70%, black)",
          900: "color-mix(in srgb, var(--border-primary) 60%, black)",
        },
        glass: {
          primary: "var(--glass-primary)",
          secondary: "var(--glass-secondary)",
          50: "color-mix(in srgb, var(--glass-primary) 50%, transparent)",
          100: "color-mix(in srgb, var(--glass-primary) 75%, transparent)",
          200: "color-mix(in srgb, var(--glass-primary) 85%, transparent)",
          300: "color-mix(in srgb, var(--glass-primary) 90%, transparent)",
          400: "color-mix(in srgb, var(--glass-primary) 95%, transparent)",
          500: "var(--glass-primary)",
          600: "color-mix(in srgb, var(--glass-primary) 90%, rgba(0,0,0,0.1))",
          700: "color-mix(in srgb, var(--glass-primary) 80%, rgba(0,0,0,0.1))",
          800: "color-mix(in srgb, var(--glass-primary) 70%, rgba(0,0,0,0.1))",
          900: "color-mix(in srgb, var(--glass-primary) 60%, rgba(0,0,0,0.1))",
        },
        // Status colors for events
        green: {
          50: "#f0fdf4",
          200: "#bbf7d0",
          500: "#22c55e",
          800: "#166534",
          900: "#14532d",
        },
        orange: {
          50: "#fff7ed",
          200: "#fed7aa",
          500: "#f97316",
          800: "#9a3412",
          900: "#7c2d12",
        },
        red: {
          50: "#fef2f2",
          200: "#fecaca",
          500: "#ef4444",
          800: "#991b1b",
          900: "#7f1d1d",
        },
        blue: {
          50: "#eff6ff",
          200: "#bfdbfe",
          500: "#3b82f6",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      spacing: {
        canvas: "var(--spacing-canvas)",
        sidebar: "var(--spacing-sidebar)",
      },
      borderRadius: {
        canvas: "var(--border-radius-canvas)",
        panel: "var(--border-radius-panel)",
        button: "var(--border-radius-button)",
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "40px",
        "3xl": "64px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
        "glass-lg": "0 16px 40px 0 rgba(31, 38, 135, 0.4)",
        glow: "0 0 20px var(--accent)",
        "glow-lg": "0 0 40px var(--accent)",
      },
      animation: {
        // Animations existantes
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",

        // Nouvelles animations
        "slide-up": "slideUp 0.3s ease-out",
        glow: "glow 2s ease-in-out infinite alternate",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "bounce-gentle": "bounceGentle 2s ease-in-out infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "gradient-x": "gradientX 15s ease infinite",
        "gradient-y": "gradientY 15s ease infinite",
        "gradient-xy": "gradientXY 15s ease infinite",
      },
      keyframes: {
        // Animations existantes
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

        // Nouvelles animations
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        glow: {
          "0%": {
            boxShadow: "0 0 20px var(--accent)",
          },
          "100%": {
            boxShadow: "0 0 30px var(--accent), 0 0 40px var(--accent-600)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        bounceGentle: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
        gradientX: {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "right center",
          },
        },
        gradientY: {
          "0%, 100%": {
            "background-size": "200% 200%",
            "background-position": "center top",
          },
          "50%": {
            "background-size": "200% 200%",
            "background-position": "center bottom",
          },
        },
        gradientXY: {
          "0%, 100%": {
            "background-size": "400% 400%",
            "background-position": "left center",
          },
          "50%": {
            "background-size": "400% 400%",
            "background-position": "right center",
          },
        },
      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        elastic: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
      },
      transitionDuration: {
        fast: "var(--transition-fast)",
        normal: "var(--transition-normal)",
        slow: "var(--transition-slow)",
      },
    },
  },
  plugins: [],
};

export default config;
