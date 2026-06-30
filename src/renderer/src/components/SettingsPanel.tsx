import { useState } from 'react'
import { useStore } from '../store'
import { THEMES, DEFAULT_CHANNEL_COLORS, BRAND_RED } from '../themes'
import type { ThemeName } from '../types'

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, setTheme } = useStore()
  const [externalApp, setExternalApp] = useState(settings.externalApp)

  const save = () => {
    setSettings({ externalApp })
    onClose()
  }

  const browseExternalApp = async () => {
    const path = await window.api.openFileDialog('exe')
    if (path) setExternalApp(path)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-2xl p-6 w-[480px] flex flex-col gap-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Settings</h2>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Theme */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
            Theme
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(THEMES) as ThemeName[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: settings.theme === t ? BRAND_RED : THEMES[t].surface,
                  color: settings.theme === t ? '#fff' : THEMES[t].text,
                  border: `1px solid ${settings.theme === t ? BRAND_RED : THEMES[t].border}`
                }}
              >
                {THEMES[t].label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette Preview */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
            Channel Color Palette
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DEFAULT_CHANNEL_COLORS.map((c) => (
              <div
                key={c}
                className="w-5 h-5 rounded-full"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* External App */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: 'var(--text-muted)' }}>
            External App (for non-log CSVs)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={externalApp}
              onChange={(e) => setExternalApp(e.target.value)}
              placeholder="Path to Excel, Notepad++, etc."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)'
              }}
            />
            <button
              onClick={browseExternalApp}
              className="px-3 py-2 rounded-lg text-sm"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Browse
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Leave empty to use the Windows default app
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-5 py-2 rounded-lg text-sm font-bold"
            style={{ background: BRAND_RED, color: '#fff' }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
