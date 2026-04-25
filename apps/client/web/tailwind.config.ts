import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "#f4f7fb",
        card: "#ffffff",
        accent: "#0f766e",
      },
      boxShadow: {
        panel: "0 12px 30px rgba(15, 23, 42, 0.12)",
      },
    },
  },
  plugins: [],
};

export default config;