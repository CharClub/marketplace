import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontSize: {
        h1: "96px",
        h2: "60px",
        h3: "48px",
        h4: "34px",
        h5: "26px",
        h6: "20px",
      },
      lineHeight: {
        h1: "104px",
        h2: "68px",
        h3: "52px",
        h4: "40px",
        h5: "32px",
        h6: "24px",
      },
      colors: {
        gray: {
          100: "#f3f4f8",
          200: "#d2d4da",
          300: "#b3b5bd",
          400: "#9496a1",
          500: "#777986",
          600: "#5b5d6b",
          700: "#404252",
          800: "#282a3a",
          900: "#101223",
        },
        primary: {
          DEFAULT: "#426aff",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#2B2E36",
          foreground: "#FFFFFF",
        },
        background: {
          0: "#15171d",
          1: "#1e2129",
          2: "#242731",
          3: "#313643",
        },
        divider: "#ffffff12",
        other: {
          stroke: "#ffffff26",
          subtitle: "#727382",
          bodyText: "#898a9c",
          placeholder: "#535461",
          disableText: "#ffffff1a",
          disableBg: "#ffffff0a",
          textFieldBg: "#ffffff12",
          bgTag: "#00000080",
          bgSection: "#1A1C24",
          /* @deprecated */
          divider: "#ffffff12",
          bg: {
            0: "#15171d",
            1: "#1e2129",
            2: "#242731",
            3: "#313643",
          },
        },
        opacityColor: {
          70: "#ffffffb2",
          50: "#ffffff80",
          15: "#ffffff26",
          10: "#ffffff1a",
          6: "#ffffff0f",
        },
        error: {
          primary: "#d80f0f",
        },
      },
    },
    screens: {
      sm: "481px",
      md: "769px",
      lg: "1025px",
      xl: "1281px",
      "2xl": "1441px",
      "3xl": "1921px",
    },
  },
  plugins: [],
};
export default config;
