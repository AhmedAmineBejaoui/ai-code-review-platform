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
        // Dark minimalist palette
        gray: {
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#e5e5e5",
          300: "#d4d4d4",
          400: "#a3a3a3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Dark minimal shadow system with subtle white glows
        glow: "0 0 32px rgba(255, 255, 255, 0.1), 0 0 64px rgba(255, 255, 255, 0.05)",
        "glow-strong": "0 0 48px rgba(255, 255, 255, 0.15), 0 0 96px rgba(255, 255, 255, 0.08)",
        "glow-white": "0 0 32px rgba(255, 255, 255, 0.12)",
        "pro-xs": "0 1px 2px 0 rgba(0, 0, 0, 0.5)",
        "pro-sm": "0 2px 8px -2px rgba(0, 0, 0, 0.3), 0 4px 16px -4px rgba(0, 0, 0, 0.2)",
        "pro-md": "0 4px 16px -4px rgba(0, 0, 0, 0.4), 0 8px 24px -8px rgba(0, 0, 0, 0.3)",
        "pro-lg": "0 8px 32px -8px rgba(0, 0, 0, 0.5), 0 16px 48px -12px rgba(0, 0, 0, 0.4)",
        "pro-xl": "0 20px 48px -12px rgba(0, 0, 0, 0.6), 0 24px 64px -16px rgba(0, 0, 0, 0.5)",
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-hero": "var(--gradient-hero)",
        "gradient-success": "var(--gradient-success)",
        "gradient-mesh": "var(--gradient-mesh)",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
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
        // Modern animations
        shimmerPro: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseGlow: {
          "0%, 100%": {
            boxShadow: "0 0 0 0 rgba(255, 255, 255, 0.3)",
            transform: "scale(1)",
          },
          "50%": {
            boxShadow: "0 0 0 10px rgba(255, 255, 255, 0)",
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
        gradientFlow: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        borderGlow: {
          "0%, 100%": {
            borderColor: "rgba(255, 255, 255, 0.1)",
            boxShadow: "0 0 20px rgba(255, 255, 255, 0.05)",
          },
          "50%": {
            borderColor: "rgba(255, 255, 255, 0.2)",
            boxShadow: "0 0 40px rgba(255, 255, 255, 0.1)",
          },
        },
        glowPulse: {
          "0%, 100%": {
            boxShadow: "0 0 20px rgba(255, 255, 255, 0.1), 0 0 40px rgba(255, 255, 255, 0.05)",
          },
          "50%": {
            boxShadow: "0 0 40px rgba(255, 255, 255, 0.15), 0 0 80px rgba(255, 255, 255, 0.08)",
          },
        },
        tiltIn: {
          from: {
            transform: "perspective(1000px) rotateX(10deg) rotateY(5deg)",
            opacity: "0",
          },
          to: {
            transform: "perspective(1000px) rotateX(0) rotateY(0)",
            opacity: "1",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        // Modern animations
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
        "gradient-flow": "gradientFlow 8s ease infinite",
        "border-glow": "borderGlow 3s ease-in-out infinite",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
        "tilt-in": "tiltIn 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config