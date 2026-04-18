import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        card: "0 14px 30px rgba(15, 23, 42, 0.15)",
      },
      colors: {
        bg: "#f8fafc",
      },
    },
  },
  plugins: [],
} satisfies Config;
