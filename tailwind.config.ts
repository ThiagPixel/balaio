import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bcdaff",
          300: "#8ec1ff",
          400: "#599dff",
          500: "#3179ff",
          600: "#1d5af5",
          700: "#1848de",
          800: "#1a3eb3",
          900: "#1c398c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
