// /** @type {import('tailwindcss').Config} */
// module.exports = {
//   content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// }

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0B0B",
        gold: "#D4AF37",
        goldDark: "#B8941F",
        gray4: "#9CA3AF",
        card: "#141414",
        cardBorder: "#1E1E1E",
      },
      fontFamily: {
        sans: ["Sora", "Inter", "Poppins", "system-ui", "sans-serif"],
        sora: ["Sora", "system-ui", "sans-serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        gold: "0 20px 56px rgba(212, 175, 55, 0.22)",
        card: "0 28px 70px rgba(0, 0, 0, 0.55)",
        soft: "0 20px 52px rgba(0, 0, 0, 0.45)",
      },
      backgroundImage: {
        "landing-main":
          "radial-gradient(circle at 18% 6%, rgba(212,175,55,0.13), transparent 46%), radial-gradient(circle at 88% 10%, rgba(255,255,255,0.06), transparent 56%), linear-gradient(180deg, #050506 0%, #0b0c0d 44%, #05060a 100%)",
        "gold-btn": "linear-gradient(180deg, #D4AF37, #B8941F)",
        "modal-bg":
          "linear-gradient(180deg, rgba(10,10,10,0.96), rgba(5,6,10,0.96))",
        "footer-bg":
          "linear-gradient(180deg, rgba(5,5,6,0.72), rgba(5,6,10,0.92))",
      },
    },
  },
  plugins: [],
}
