import type { Theme, ThemeName } from './types'

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    label: 'Dark',
    bg: '#0f1117',
    surface: '#1a1d27',
    border: '#2a2d3a',
    text: '#e2e8f0',
    textMuted: '#64748b',
    accent: '#7c6ef7',
    chartBg: '#0f1117',
    gridColor: '#1e2130',
    axisColor: '#3a3d50'
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight Blue',
    bg: '#050a18',
    surface: '#0d1626',
    border: '#1a2540',
    text: '#c9d8f0',
    textMuted: '#4a6080',
    accent: '#3d8ef0',
    chartBg: '#050a18',
    gridColor: '#0d1626',
    axisColor: '#1a2540'
  },
  nord: {
    name: 'nord',
    label: 'Nord',
    bg: '#2e3440',
    surface: '#3b4252',
    border: '#434c5e',
    text: '#eceff4',
    textMuted: '#7b88a1',
    accent: '#88c0d0',
    chartBg: '#2e3440',
    gridColor: '#3b4252',
    axisColor: '#434c5e'
  },
  solarized: {
    name: 'solarized',
    label: 'Solarized Dark',
    bg: '#002b36',
    surface: '#073642',
    border: '#124652',
    text: '#839496',
    textMuted: '#586e75',
    accent: '#268bd2',
    chartBg: '#002b36',
    gridColor: '#073642',
    axisColor: '#124652'
  },
  light: {
    name: 'light',
    label: 'Light',
    bg: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#1e293b',
    textMuted: '#94a3b8',
    accent: '#7c6ef7',
    chartBg: '#ffffff',
    gridColor: '#f1f5f9',
    axisColor: '#cbd5e1'
  }
}

export const DEFAULT_CHANNEL_COLORS = [
  '#ff3d71', '#00d4ff', '#a78bfa', '#34d399', '#fbbf24',
  '#fb923c', '#f472b6', '#60a5fa', '#4ade80', '#e879f9',
  '#38bdf8', '#f87171', '#a3e635', '#c084fc', '#2dd4bf',
  '#fb7185', '#818cf8', '#86efac', '#fcd34d', '#67e8f9'
]
