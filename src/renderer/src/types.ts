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

export type PanelPosition = 'bottom' | 'top' | 'left' | 'right'

export type FontSize = 'small' | 'normal' | 'large'

export interface AppSettings {
  externalApp: string
  theme: ThemeName
  channelColors: string[]
  channelListPosition: PanelPosition
  fontSize: FontSize
}

export type ThemeName = 'dark' | 'midnight' | 'light' | 'nord' | 'solarized'

export interface ChannelPreset {
  id: string
  name: string
  logger: string       // e.g. "VCDS", "MoTeC" — display label only
  channels: string[]   // channel names that should be visible
  createdAt: number
  lastUsedAt: number   // updated each time the preset is applied
}

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
