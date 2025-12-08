import type { Config } from "tailwindcss";
import { heroui } from "@heroui/react";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          10: "#00F7A5",
          20: "#004F35",
          30: "#00E79A",
          40: "#00835A",
          50: "#00D58E",
          60: "#006946",
          70: "#07ddc3",
          80: "#05cc88",
          90: "#F9FFFD",
          100: "#00C885",
          110: "#00B77A",
          120: "#00C181",
        },
        gray: {
          10: "#E4E4E5",
          20: "#7B7B7B",
          30: "#D8DCE4",
          40: "#7E8A93",
          50: "#8A8A8D",
          60: "#F1F1F1",
          70: "#F3F3F3",
          80: "#EFF1F4",
          90: "#768087",
          100: "#E0E2E5",
          110: "#5C5C5C",
          120: "#E6E9EE",
          130: "#4F575C",
          140: "#C9CDD6",
          150: "#C6C6C6",
          160: "#EEEEEE",
          170: "#CCCCCC",
          180: "#52525B",
          190: "#303037",
          200: "#6F6F6F",
          210: "#EAEAEA",
          220: "#6A7279",
          230: "#E5E9F0",
          240: "#A7A7A7",
          250: "#DBDCDE",
          260:"#7F8A93"
        },
        red: {
          10: "#FF5016",
          20: "#411300",
          30: "#FEF0E5",
          40: '#FF9500',
          50: '#F73E00',
          60: '#FF0420',
          70: "#FF5500",
          80: "#FF2F00",
          90: "#FF4D00",
          100: "#FF4000",
        },
        yellow: {
          10: "#FFD300",
          20: "#FFB018",
        },
        b: {
          10: "#191C1F",
          20: "#40435A",
          30: "#3F4147",
          40: "#14162B",
          50: "#16161B",
          60: "#383838",
          70: "#202026",
        },
        w: {
          10: "#F7F8F9",
          20: "#ECEFF2",
          30: "#EAEDF2",
        }
      },
      backgroundImage: (theme) => ({
        linear_gradient_dark: "linear-gradient(180deg, #525365 0%, #2E3043 100%)",
      }),
    },
  },
  plugins: [
    heroui({
      addCommonColors: true,
      defaultTheme: "light",
      layout: {
        borderWidth: {
          small: "1px", // border-small
          medium: "1px", // border-medium
          large: "2px", // border-large
        },
        radius: {
          small: "4px",
          medium: "8px",
          large: "12px",
        },
      },
      themes: {
        light: {
          colors: {},
        },
      },
    }),
  ],
} satisfies Config;
