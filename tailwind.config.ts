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
        brand: {
          DEFAULT: "#E8481A",
          dark: "#C93A10",
          light: "#FFF1EC",
        },
        bg: "#F5F5F5",
        ink: {
          DEFAULT: "#1A1A1A",
          sub: "#888888",
          del: "#AAAAAA",
        },
        line: {
          DEFAULT: "#E5E5E5",
          strong: "#CCCCCC",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-kr)", "Noto Sans KR", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "6px",
      },
      maxWidth: {
        page: "1200px",
      },
    },
  },
  plugins: [],
};
export default config;
