import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#050508",
        foreground: "#EDEDED",
        brand: {
          void: "#040406",
          black: "#07080c",
          dark: "#0d0f17",
          card: "#12141f",
          surface: "#181b2a",
          border: "#28151c",
          borderHover: "#451c27",
          redDark: "#700813",
          redDeep: "#990A1B",
          red: "#D61122",
          redBright: "#FF1E27",
          redNeon: "#FF3344",
          redGlow: "rgba(255, 30, 39, 0.35)",
          gray: {
            light: "#F1F5F9",
            text: "#CBD5E1",
            muted: "#94A3B8",
            dim: "#64748B",
          },
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      boxShadow: {
        "red-glow-sm": "0 0 15px -3px rgba(255, 30, 39, 0.25)",
        "red-glow": "0 0 25px -4px rgba(255, 30, 39, 0.35)",
        "red-glow-lg": "0 0 45px -5px rgba(255, 30, 39, 0.5)",
      },
      backgroundImage: {
        "cyber-grid":
          "linear-gradient(to right, rgba(255, 30, 39, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 30, 39, 0.05) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(circle at 50% 20%, rgba(214, 17, 34, 0.15), transparent 70%)",
      },
      animation: {
        "pulse-subtle": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
export default config;
