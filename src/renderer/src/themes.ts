import type { Theme, ThemeName } from './types'

// ProTune brand teal
export const BRAND_RED = '#1B9090'
export const BRAND_RED_DIM = 'rgba(27,144,144,0.15)'
export const BRAND_RED_GLOW = 'rgba(27,144,144,0.35)'

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    label: 'Dark',
    bg: '#0a0b0f',
    surface: '#12141a',
    border: '#1e2028',
    text: '#e8eaf0',
    textMuted: '#4a5068',
    accent: BRAND_RED,
    chartBg: '#0a0b0f',
    gridColor: '#16181f',
    axisColor: '#2a2d3a'
  },
  midnight: {
    name: 'midnight',
    label: 'Midnight',
    bg: '#05080f',
    surface: '#0b1020',
    border: '#141d34',
    text: '#c8d4f0',
    textMuted: '#3d5070',
    accent: BRAND_RED,
    chartBg: '#05080f',
    gridColor: '#0b1020',
    axisColor: '#141d34'
  },
  nord: {
    name: 'nord',
    label: 'Nord',
    bg: '#242933',
    surface: '#2e3440',
    border: '#3b4252',
    text: '#eceff4',
    textMuted: '#6b7899',
    accent: BRAND_RED,
    chartBg: '#242933',
    gridColor: '#2e3440',
    axisColor: '#3b4252'
  },
  solarized: {
    name: 'solarized',
    label: 'Solarized',
    bg: '#001f29',
    surface: '#002b36',
    border: '#073642',
    text: '#93a1a1',
    textMuted: '#506e75',
    accent: BRAND_RED,
    chartBg: '#001f29',
    gridColor: '#002b36',
    axisColor: '#073642'
  },
  light: {
    name: 'light',
    label: 'Light',
    bg: '#f4f5f7',
    surface: '#ffffff',
    border: '#e2e5eb',
    text: '#111318',
    textMuted: '#8892a4',
    accent: BRAND_RED,
    chartBg: '#ffffff',
    gridColor: '#f0f1f4',
    axisColor: '#d8dbe3'
  }
}

export const DEFAULT_CHANNEL_COLORS = [
  '#1B9090', '#00c8ff', '#a78bfa', '#10d980', '#f59e0b',
  '#f97316', '#ec4899', '#3b82f6', '#22c55e', '#d946ef',
  '#06b6d4', '#ef4444', '#84cc16', '#8b5cf6', '#14b8a6',
  '#fb7185', '#6366f1', '#4ade80', '#fbbf24', '#38bdf8'
]
