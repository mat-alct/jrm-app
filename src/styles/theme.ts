import { createSystem, defaultConfig } from '@chakra-ui/react';

export const theme = createSystem(defaultConfig, {
  globalCss: {
    body: { bg: 'app.canvas', color: 'app.text' },
  },
  theme: {
    tokens: {
      colors: {
        gray: {
          900: { value: '#181B23' },
          800: { value: '#1F2029' },
          700: { value: '#353646' },
          600: { value: '#4B4D63' },
          500: { value: '#616480' },
          400: { value: '#797D94' },
          300: { value: '#9699B0' },
          200: { value: '#B3B5C6' },
          100: { value: '#D1D2DC' },
          50: { value: '#EEEEF2' },
        },
        orange: {
          50: { value: '#F4F4F4' },
          100: { value: '#E5E5E4' },
          200: { value: '#C7C6C5' },
          300: { value: '#A6A5A4' },
          400: { value: '#7F7E7D' },
          500: { value: '#2E2D2C' },
          600: { value: '#272625' },
          700: { value: '#20201F' },
          800: { value: '#171716' },
          900: { value: '#0E0D0D' },
        },
        yellow: {
          50: { value: '#FFF8E1' },
          100: { value: '#FFE5A8' },
          200: { value: '#F8D173' },
          300: { value: '#E8B842' },
          400: { value: '#D9A015' },
          500: { value: '#B8860B' },
          600: { value: '#9F7409' },
          700: { value: '#866207' },
          800: { value: '#6D5006' },
          900: { value: '#543E04' },
        },
        sand: {
          50: { value: '#FAFAF9' },
          100: { value: '#F5F4F2' },
          200: { value: '#E9E7E3' },
          300: { value: '#D9D6D0' },
          400: { value: '#B8B4AC' },
          500: { value: '#918D84' },
          600: { value: '#6B675F' },
          700: { value: '#504C45' },
          800: { value: '#37342F' },
          900: { value: '#23211D' },
        },
        brand: {
          50: { value: '#FBF7EC' },
          100: { value: '#F5EACB' },
          200: { value: '#EBD79E' },
          300: { value: '#DFBE68' },
          400: { value: '#D2A43B' },
          500: { value: '#B8860B' },
          600: { value: '#9A6F08' },
          700: { value: '#7C5906' },
          800: { value: '#5E4305' },
          900: { value: '#402E03' },
        },
      },
      fonts: {
        heading: { value: "'Inter', -apple-system, 'Segoe UI', sans-serif" },
        body: { value: "'Inter', -apple-system, 'Segoe UI', sans-serif" },
      },
      shadows: {
        card: {
          value:
            '0 1px 2px rgba(35,33,29,0.04), 0 2px 8px -2px rgba(35,33,29,0.06)',
        },
        cardHover: {
          value:
            '0 2px 4px rgba(35,33,29,0.05), 0 10px 24px -8px rgba(35,33,29,0.12)',
        },
        focus: { value: '0 0 0 3px rgba(210,164,59,0.35)' },
      },
    },
    semanticTokens: {
      colors: {
        'app.canvas': { value: '{colors.sand.50}' },
        'app.surface': { value: '#FFFFFF' },
        'app.sunken': { value: '{colors.sand.100}' },
        'app.border': { value: '{colors.sand.200}' },
        'app.borderStrong': { value: '{colors.sand.300}' },
        'app.text': { value: '{colors.sand.900}' },
        'app.textSecondary': { value: '{colors.sand.600}' },
        'app.textMuted': { value: '{colors.sand.500}' },
        'app.accent': { value: '{colors.brand.500}' },
        'app.accentEmphasis': { value: '{colors.brand.600}' },
        'app.accentSubtle': { value: '{colors.brand.50}' },
        'app.ink': { value: '#2E2D2C' },
        'app.inkHover': { value: '#1B1A19' },
      },
    },
  },
});
