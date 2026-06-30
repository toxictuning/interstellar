export interface LogChannel {
  name: string
  unit: string
  color: string
  visible: boolean
  data: number[]
  min: number
  max: number
}

export interface LogFile {
  path: string
  name: string
  timestamps: number[]
  channels: LogChannel[]
  rowCount: number
}

export type ViewMode = 'single' | 'split' | 'raw'

export interface AppSettings {
  externalApp: string
  theme: ThemeName
  channelColors: string[]
}

export type ThemeName = 'dark' | 'midnight' | 'light' | 'nord' | 'solarized'

export interface Theme {
  name: ThemeName
  label: string
  bg: string
  surface: string
  border: string
  text: string
  textMuted: string
  accent: string
  chartBg: string
  gridColor: string
  axisColor: string
}
