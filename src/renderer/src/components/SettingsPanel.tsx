import { useState } from 'react'
import { useStore } from '../store'
import { THEMES, DEFAULT_CHANNEL_COLORS, BRAND_RED } from '../themes'
import type { ThemeName, PanelPosition } from '../types'

const POSITIONS: { value: PanelPosition; label: string; icon: React.ReactNode }[] = [
  {
    value: 'bottom',
    label: 'Bottom',
    icon: (
      <svg width="28" height="22" viewBox="0 0 28 22">
        <rect x="1" y="1" width="26" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="15" width="26" height="6" rx="2" fill="currentColor" opacity="0.35" />
      </svg>
    )
  },
  {
    value: 'top',
    label: 'Top',
    icon: (
      <svg width="28" height="22" viewBox="0 0 28 22">
        <rect x="1" y="1" width="26" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="1" width="26" height="6" rx="2" fill="currentColor" opacity="0.35" />
      </svg>
    )
  },
  {
    value: 'left',
    label: 'Left',
    icon: (
      <svg width="28" height="22" viewBox="0 0 28 22">
        <rect x="1" y="1" width="26" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="1" y="1" width="9" height="20" rx="2" fill="currentColor" opacity="0.35" />
      </svg>
    )
  },
  {
    value: 'right',
    label: 'Right',
    icon: (
      <svg width="28" height="22" viewBox="0 0 28 22">
        <rect x="1" y="1" width="26" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <rect x="18" y="1" width="9" height="20" rx="2" fill="currentColor" opacity="0.35" />
      </svg>
    )
  }
]

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

  const setPosition = (p: PanelPosition) => setSettings({ channelListPosition: p })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: 24,
          width: 500,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
          boxShadow: '0 24px 80px rgba(0,0,0,0.7)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.04em' }}>Settings</span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Theme */}
        <Section label="Theme">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(Object.keys(THEMES) as ThemeName[]).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  border: `1px solid ${settings.theme === t ? BRAND_RED : THEMES[t].border}`,
                  background: settings.theme === t ? BRAND_RED : THEMES[t].surface,
                  color: settings.theme === t ? '#fff' : THEMES[t].text,
                  fontSize: 12,
                  fontWeight: settings.theme === t ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {THEMES[t].label}
              </button>
            ))}
          </div>
        </Section>

        {/* Channel panel position */}
        <Section label="Channel List Position">
          <div style={{ display: 'flex', gap: 8 }}>
            {POSITIONS.map(({ value, label, icon }) => {
              const active = settings.channelListPosition === value
              return (
                <button
                  key={value}
                  onClick={() => setPosition(value)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 8px',
                    borderRadius: 8,
                    border: `1px solid ${active ? BRAND_RED : 'var(--border)'}`,
                    background: active ? `rgba(229,0,10,0.1)` : 'var(--bg)',
                    color: active ? BRAND_RED : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  title={label}
                >
                  {icon}
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 400, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        </Section>

        {/* Channel color palette */}
        <Section label="Channel Colors">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {DEFAULT_CHANNEL_COLORS.map((c) => (
              <div
                key={c}
                style={{ width: 18, height: 18, borderRadius: '50%', background: c }}
                title={c}
              />
            ))}
          </div>
        </Section>

        {/* External app */}
        <Section label="External App">
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={externalApp}
              onChange={(e) => setExternalApp(e.target.value)}
              placeholder="Path to Excel, Notepad++, etc."
              style={{
                flex: 1,
                padding: '7px 12px',
                borderRadius: 7,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 12,
                outline: 'none'
              }}
            />
            <button
              onClick={browseExternalApp}
              style={{
                padding: '7px 12px',
                borderRadius: 7,
                border: '1px solid var(--border)',
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Browse
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Leave empty to use the Windows default app
          </p>
        </Section>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 2 }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none',
              background: 'transparent', color: 'var(--text-muted)',
              fontSize: 12, cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            style={{
              padding: '7px 20px', borderRadius: 7, border: 'none',
              background: BRAND_RED, color: '#fff',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.06em',
              cursor: 'pointer'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)'
        }}
      >
        {label}
      </span>
      {children}
    </div>
  )
}
