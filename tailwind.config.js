/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        tile: 'rgb(var(--tile) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        'line-strong': 'rgb(var(--line-strong) / <alpha-value>)',
        'accent-subtle': 'rgb(var(--accent-subtle) / <alpha-value>)',
        'negative-subtle': 'rgb(var(--negative-subtle) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'on-accent': 'rgb(var(--on-accent) / <alpha-value>)',
        income: 'rgb(var(--income) / <alpha-value>)',
        expense: 'rgb(var(--expense) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
