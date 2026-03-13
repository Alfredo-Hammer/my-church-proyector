/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        // Breakpoints Tailwind por defecto: sm 640, md 768, lg 1024, xl 1280, 2xl 1536
        // Agregamos 3xl para monitores 4K / ultrawide
        '3xl': '1920px',
      },
      gridTemplateColumns: {
        // grid-cols-14 para grillas de capítulos/versículos en pantallas grandes
        '14': 'repeat(14, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}