/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./utils/**/*.{js,ts,jsx,tsx}"],
  plugins: [require("daisyui")],
  darkTheme: "scaffoldEthDark",
  // DaisyUI theme colors
  daisyui: {
    themes: [
      {
        scaffoldEth: {
          // primary: "#93BBFB",
          // "primary-content": "#212638",
          // secondary: "#DAE8FF",
          // "secondary-content": "#212638",
          // accent: "#93BBFB",
          // "accent-content": "#212638",
          // neutral: "#212638",
          // "neutral-content": "#ffffff",
          // "base-100": "#ffffff",
          // "base-200": "#f4f8ff",
          // "base-300": "#DAE8FF",
          // "base-content": "#212638",
          // info: "#93BBFB",
          // success: "#34EEB6",
          // warning: "#FFCF72",
          // error: "#FF8863",

          // customized
          primary: "#1c1917",
          "primary-content": "#fcfeff",
          secondary: "#4ade80",
          "secondary-content": "#212638",
          accent: "#7dd3fc",
          "accent-content": "#fcfeff",
          neutral: "#1f2937",
          "neutral-content": "#ffffff",
          "base-100": "#e5e7eb",
          "base-200": "#f4f8ff",
          "base-300": "#DAE8FF",
          "base-content": "#212638",
          info: "#60a5fa",
          success: "#15803d",
          warning: "#fbbf24",
          error: "#ef4444",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
      {
        scaffoldEthDark: {
          // primary: "#212638",
          // "primary-content": "#F9FBFF",
          // secondary: "#323f61",
          // "secondary-content": "#F9FBFF",
          // accent: "#4969A6",
          // "accent-content": "#F9FBFF",
          // neutral: "#F9FBFF",
          // "neutral-content": "#385183",
          // "base-100": "#385183",
          // "base-200": "#2A3655",
          // "base-300": "#212638",
          // "base-content": "#F9FBFF",
          // info: "#385183",
          // success: "#34EEB6",
          // warning: "#FFCF72",
          // error: "#FF8863",

          // customized
          primary: "#e5e7eb",
          "primary-content": "#1e1e1f",
          secondary: "#4ade80",
          "secondary-content": "#212638",
          accent: "#7dd3fc",
          "accent-content": "#fcfeff",
          neutral: "#1f2937",
          "neutral-content": "#ffffff",
          "base-100": "#1f2937",
          "base-200": "#111827",
          "base-300": "#374151",
          "base-content": "#e5e7eb",
          info: "#60a5fa",
          success: "#15803d",
          warning: "#fbbf24",
          error: "#ef4444",

          "--rounded-btn": "9999rem",

          ".tooltip": {
            "--tooltip-tail": "6px",
            "--tooltip-color": "oklch(var(--p))",
          },
          ".link": {
            textUnderlineOffset: "2px",
          },
          ".link:hover": {
            opacity: "80%",
          },
        },
      },
    ],
  },
  theme: {
    extend: {
      boxShadow: {
        center: "0 0 12px -2px rgb(0 0 0 / 0.05)",
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
};
