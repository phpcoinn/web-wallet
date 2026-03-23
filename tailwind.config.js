/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  // Disable preflight to preserve Bootstrap base styles
  corePlugins: {
    preflight: false,
  },
}
