import daisyui from 'daisyui'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{html,js,svelte}'],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    // Follows the browser/OS color scheme.
    themes: ['light', 'dark'],
    darkTheme: 'dark',
    logs: false,
  },
}
