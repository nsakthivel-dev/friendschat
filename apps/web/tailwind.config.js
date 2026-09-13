/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: { colors: { ink: "#17202b", mist: "#f7f8fa", lavender: "#7357e5" }, boxShadow: { soft: "0 18px 60px rgba(35, 38, 60, .08)" } } },
  plugins: []
};
