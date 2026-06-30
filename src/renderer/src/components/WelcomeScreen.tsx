import { useState, useCallback } from 'react'
import { useStore } from '../store'
import { parseCSV } from '../csvParser'
import SettingsPanel from './SettingsPanel'
import logoSrc from '../assets/logo.png'
import { BRAND_RED, BRAND_RED_DIM, BRAND_RED_GLOW } from '../themes'

export default function WelcomeScreen() {
  const { settings, setLogFile } = useStore()
  const [dragging, setDragging] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingView, setLoadingView] = useState(false)

  const loadFile = async (path: string) => {
    setError(null)
    setLoadingView(true)
    const res = await window.api.readFile(path)
    setLoadingView(false)
    if (!res.ok || !res.content) {
      setError('Could not read file.')
      return
    }
    const parsed = parseCSV(res.content, path)
    if (!parsed) {
      setError('No valid data found in this CSV.')
      return
    }
    setLogFile(parsed)
  }

  const handleOpenDialog = async () => {
    const path = await window.api.openFileDialog()
    if (path) loadFile(path)
  }

  const handleOpenExternal = async () => {
    const path = await window.api.openFileDialog()
    if (path) window.api.openExternal(path, settings.externalApp || undefined)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file && file.name.endsWith('.csv')) {
      loadFile((file as File & { path: string }).path)
    }
  }, [])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Ambient red glow — very subtle, behind everything */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 400,
          borderRadius: '50%',
          background: `radial-gradient(ellipse at center, ${BRAND_RED_GLOW} 0%, transparent 70%)`,
          filter: 'blur(60px)',
          opacity: 0.25,
          pointerEvents: 'none'
        }}
      />

      {/* Drop overlay */}
      {dragging && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            background: BRAND_RED_DIM,
            border: `2px dashed ${BRAND_RED}`,
            color: BRAND_RED,
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase'
          }}
        >
          Drop to open log
        </div>
      )}

      {/* Main content card */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
          zIndex: 1,
          width: 340
        }}
      >
        {/* Logo */}
        <img
          src={logoSrc}
          alt="Toxic Tuning"
          draggable={false}
          style={{
            height: 52,
            width: 'auto',
            objectFit: 'contain',
            borderRadius: 4,
            display: 'block',
            marginBottom: 24
          }}
        />

        {/* Product label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 36
          }}
        >
          <div style={{ height: 1, width: 32, background: 'var(--border)' }} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)'
            }}
          >
            LogView
          </span>
          <div style={{ height: 1, width: 32, background: 'var(--border)' }} />
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleOpenDialog}
          disabled={loadingView}
          style={{
            width: '100%',
            padding: '14px 0',
            borderRadius: 6,
            border: 'none',
            background: loadingView ? 'rgba(229,0,10,0.5)' : BRAND_RED,
            color: '#fff',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            cursor: loadingView ? 'default' : 'pointer',
            transition: 'opacity 0.15s, transform 0.1s',
            boxShadow: `0 0 32px ${BRAND_RED_GLOW}, 0 2px 8px rgba(0,0,0,0.4)`,
            marginBottom: 10
          }}
          onMouseEnter={(e) => {
            if (!loadingView) {
              e.currentTarget.style.opacity = '0.88'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
            e.currentTarget.style.transform = 'translateY(0)'
          }}
        >
          {loadingView ? 'Opening…' : 'View Log'}
        </button>

        {/* Secondary CTA */}
        <button
          onClick={handleOpenExternal}
          style={{
            width: '100%',
            padding: '11px 0',
            borderRadius: 6,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'border-color 0.15s, color 0.15s',
            marginBottom: 28
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(229,0,10,0.4)'
            e.currentTarget.style.color = 'var(--text)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          Open in {settings.externalApp ? shortenPath(settings.externalApp) : 'External App'}
        </button>

        {/* Hint + Settings */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%'
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.5 }}>
            or drag & drop a CSV
          </span>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 11,
              cursor: 'pointer',
              opacity: 0.5,
              letterSpacing: '0.06em',
              transition: 'opacity 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5' }}
          >
            Settings
          </button>
        </div>

        {error && (
          <div
            style={{
              marginTop: 16,
              padding: '8px 14px',
              borderRadius: 6,
              background: BRAND_RED_DIM,
              border: `1px solid rgba(229,0,10,0.3)`,
              color: BRAND_RED,
              fontSize: 12
            }}
          >
            {error}
          </div>
        )}
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function shortenPath(p: string) {
  const name = p.split(/[\\/]/).pop()?.replace(/\.exe$/i, '') ?? 'External App'
  return name || 'External App'
}
