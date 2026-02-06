/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        fedora: {
          blue: '#51a2da',
          'dark-blue': '#294172',
          'medium-blue': '#3c6eb4',
        },
      },
    },
  },
  plugins: [],
};
