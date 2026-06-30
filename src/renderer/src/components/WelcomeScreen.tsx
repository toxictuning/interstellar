import { useState, useCallback } from 'react'
import { useStore } from '../store'
import { parseCSV } from '../csvParser'
import SettingsPanel from './SettingsPanel'

export default function WelcomeScreen() {
  const { settings, setLogFile } = useStore()
  const [dragging, setDragging] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFile = async (path: string) => {
    setError(null)
    const res = await window.api.readFile(path)
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

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith('.csv')) {
        loadFile((file as File & { path: string }).path)
      }
    },
    []
  )

  return (
    <div
      className="flex flex-col items-center justify-center h-full gap-8 relative"
      style={{ background: 'var(--bg)' }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      {dragging && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10 text-2xl font-bold"
          style={{
            background: 'rgba(124, 110, 247, 0.15)',
            border: '2px dashed var(--accent)',
            color: 'var(--accent)'
          }}
        >
          Drop CSV file here
        </div>
      )}

      {/* Logo */}
      <div className="text-center">
        <div className="text-5xl font-black tracking-tight mb-1" style={{ color: 'var(--accent)' }}>
          LogView
        </div>
        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Fast CSV data log viewer
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 w-72">
        <button
          onClick={handleOpenDialog}
          className="w-full py-4 rounded-xl text-base font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'var(--accent)',
            color: '#fff',
            boxShadow: '0 4px 24px rgba(124, 110, 247, 0.4)'
          }}
        >
          VIEW LOG
        </button>

        <button
          onClick={handleOpenExternal}
          className="w-full py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)'
          }}
        >
          Open in {settings.externalApp ? shortenPath(settings.externalApp) : 'External App'}
        </button>

        <button
          onClick={() => setShowSettings(true)}
          className="w-full py-2 rounded-xl text-xs transition-all"
          style={{ color: 'var(--text-muted)' }}
        >
          Settings
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Drag & drop a CSV file or click VIEW LOG
      </p>

      {error && (
        <p className="text-xs px-4 py-2 rounded-lg" style={{ background: '#ef444420', color: '#ef4444' }}>
          {error}
        </p>
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function shortenPath(p: string) {
  const parts = p.split(/[\\/]/)
  const name = parts[parts.length - 1].replace(/\.exe$/i, '')
  return name || 'External App'
}
