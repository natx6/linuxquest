import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0D1117',
        surface: '#161B22',
        'surface-low': '#181c22',
        'surface-container': '#1c2026',
        'surface-high': '#262a31',
        'surface-highest': '#31353c',
        border: '#21262D',
        text: {
          DEFAULT: '#E6EDF3',
          muted: '#7D8590',
        },
        accent: {
          cyan: '#22D3EE',
          magenta: '#E879F9',
        },
        state: {
          success: '#3FB950',
          warning: '#D29922',
          error: '#F85149',
        },
        track: {
          basics: '#22D3EE',
          sysadmin: '#FB923C',
          dev: '#A78BFA',
          network: '#4ADE80',
        },
        terminal: '#0A0E14',
      },
      borderRadius: {
        card: '8px',
        btn: '6px',
        input: '4px',
        sheet: '16px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        app: '430px',
      },
    },
  },
  plugins: [],
} satisfies Config;
