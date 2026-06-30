import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LogFile, ViewMode, AppSettings, ThemeName, ChannelPreset } from './types'
import { DEFAULT_CHANNEL_COLORS } from './themes'

interface LogStore {
  logFile: LogFile | null
  viewMode: ViewMode
  settings: AppSettings
  channelPresets: ChannelPreset[]
  updateAvailable: { version: string } | null
  updateDownloaded: boolean
  updateProgress: number | null

  setLogFile: (file: LogFile | null) => void
  setViewMode: (mode: ViewMode) => void
  toggleChannel: (name: string) => void
  setChannelColor: (name: string, color: string) => void
  setSettings: (s: Partial<AppSettings>) => void
  setTheme: (t: ThemeName) => void
  saveChannelPreset: (name: string, logger: string, channels: string[]) => void
  deleteChannelPreset: (id: string) => void
  applyChannelPreset: (id: string) => void
  setUpdateAvailable: (info: { version: string } | null) => void
  setUpdateDownloaded: (v: boolean) => void
  setUpdateProgress: (p: number | null) => void
}

export const useStore = create<LogStore>()(
  persist(
    (set) => ({
      logFile: null,
      viewMode: 'single',
      settings: {
        externalApp: '',
        theme: 'dark',
        channelColors: DEFAULT_CHANNEL_COLORS,
        channelListPosition: 'left',
        fontSize: 'normal'
      },
      channelPresets: [],
      updateAvailable: null,
      updateDownloaded: false,
      updateProgress: null,

      setLogFile: (file) => set({ logFile: file }),
      setViewMode: (mode) => set({ viewMode: mode }),
      toggleChannel: (name) =>
        set((s) => ({
          logFile: s.logFile
            ? { ...s.logFile, channels: s.logFile.channels.map((c) => c.name === name ? { ...c, visible: !c.visible } : c) }
            : null
        })),
      setChannelColor: (name, color) =>
        set((s) => ({
          logFile: s.logFile
            ? { ...s.logFile, channels: s.logFile.channels.map((c) => c.name === name ? { ...c, color } : c) }
            : null
        })),
      setSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),
      setTheme: (t) =>
        set((s) => ({ settings: { ...s.settings, theme: t } })),

      saveChannelPreset: (name, logger, channels) =>
        set((s) => ({
          channelPresets: [
            ...s.channelPresets,
            { id: crypto.randomUUID(), name, logger, channels, createdAt: Date.now(), lastUsedAt: 0 }
          ]
        })),

      deleteChannelPreset: (id) =>
        set((s) => ({ channelPresets: s.channelPresets.filter((p) => p.id !== id) })),

      // Atomically apply a preset: sets channel visibility + records usage time
      applyChannelPreset: (id) =>
        set((s) => {
          const preset = s.channelPresets.find((p) => p.id === id)
          if (!preset || !s.logFile) return {}
          const names = new Set(preset.channels)
          return {
            logFile: {
              ...s.logFile,
              channels: s.logFile.channels.map((c) => ({ ...c, visible: names.has(c.name) }))
            },
            channelPresets: s.channelPresets.map((p) =>
              p.id === id ? { ...p, lastUsedAt: Date.now() } : p
            )
          }
        }),

      setUpdateAvailable: (info) => set({ updateAvailable: info }),
      setUpdateDownloaded: (v) => set({ updateDownloaded: v }),
      setUpdateProgress: (p) => set({ updateProgress: p })
    }),
    {
      name: 'interstellar-settings',
      partialize: (s) => ({ settings: s.settings, channelPresets: s.channelPresets })
    }
  )
)
