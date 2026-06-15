import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#e11d6b",
          dark: "#be185d",
          light: "#fce7f0",
        },
      },
      fontFamily: {
        sans: ["var(--dc-font)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.06)",
        glass: "0 8px 30px rgba(16,24,40,0.08)",
      },
      borderRadius: {
        "4xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
