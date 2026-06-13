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
    },
  },
  plugins: [],
};

export default config;
