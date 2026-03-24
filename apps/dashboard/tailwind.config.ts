import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        "chart-1": "var(--chart-1)",
        "chart-2": "var(--chart-2)",
        "chart-3": "var(--chart-3)",
        "chart-4": "var(--chart-4)",
        "chart-5": "var(--chart-5)",
        // Professional blue palette
        "blue-pro": {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Professional shadow system with blue tint
        glow: "0 0 32px rgba(37, 99, 235, 0.4)",
        "glow-strong": "0 0 48px rgba(37, 99, 235, 0.6)",
        "pro-xs": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "pro-sm":
          "0 2px 8px -2px rgba(37, 99, 235, 0.1), 0 4px 16px -4px rgba(0, 0, 0, 0.05)",
        "pro-md":
          "0 4px 16px -4px rgba(37, 99, 235, 0.15), 0 8px 24px -8px rgba(0, 0, 0, 0.1)",
        "pro-lg":
          "0 8px 32px -8px rgba(37, 99, 235, 0.2), 0 16px 48px -12px rgba(0, 0, 0, 0.15)",
        "pro-xl":
          "0 20px 48px -12px rgba(37, 99, 235, 0.25), 0 24px 64px -16px rgba(0, 0, 0, 0.2)",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-hero": "var(--gradient-hero)",
        "gradient-success": "var(--gradient-success)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Professional animations
        shimmerPro: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGlow: {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(37, 99, 235, 0.7)",
            transform: "scale(1)",
          },
          "50%": {
            boxShadow: "0 0 0 10px rgba(37, 99, 235, 0)",
            transform: "scale(1.05)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        slideInBottom: {
          from: {
            opacity: "0",
            transform: "translateY(24px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        slideInLeft: {
          from: {
            opacity: "0",
            transform: "translateX(-24px)",
          },
          to: {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        slideInRight: {
          from: {
            opacity: "0",
            transform: "translateX(24px)",
          },
          to: {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        scaleInFade: {
          from: {
            opacity: "0",
            transform: "scale(0.92)",
          },
          to: {
            opacity: "1",
            transform: "scale(1)",
          },
        },
        fadeInUp: {
          from: {
            opacity: "0",
            transform: "translateY(16px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        spinSmooth: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Professional animations
        shimmerPro: "shimmerPro 2s ease-in-out infinite",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "slide-in-bottom": "slideInBottom 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-left": "slideInLeft 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "slide-in-right": "slideInRight 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "scale-in-fade": "scaleInFade 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        "fade-in-up": "fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
        "spin-smooth": "spinSmooth 0.6s ease-in-out",
        "spin-smooth-infinite": "spinSmooth 1s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config