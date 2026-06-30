import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { parseCSV } from '../csvParser'
import Chart from './Chart'
import ChannelList from './ChannelList'
import SettingsPanel from './SettingsPanel'
import type { ViewMode } from '../types'

export default function LogViewer() {
  const { logFile, viewMode, setViewMode, setLogFile } = useStore()
  const [showSettings, setShowSettings] = useState(false)

  if (!logFile) return null

  const openNew = async () => {
    const path = await window.api.openFileDialog()
    if (!path) return
    const res = await window.api.readFile(path)
    if (res.ok && res.content) {
      const parsed = parseCSV(res.content, path)
      if (parsed) setLogFile(parsed)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-4 h-12 shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        {/* File info */}
        <button
          onClick={() => setLogFile(null)}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--bg)' }}
          title="Back to home"
        >
          ← Back
        </button>

        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg transition-colors"
          style={{ color: 'var(--text-muted)', background: 'var(--bg)' }}
        >
          Open
        </button>

        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {logFile.rowCount.toLocaleString()} rows · {logFile.channels.length} channels
        </div>

        <div className="flex-1" />

        {/* View mode tabs */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg"
          style={{ background: 'var(--bg)' }}
        >
          {(['single', 'split', 'raw'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className="px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors"
              style={{
                background: viewMode === m ? 'var(--accent)' : 'transparent',
                color: viewMode === m ? '#fff' : 'var(--text-muted)'
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg"
          style={{ color: 'var(--text-muted)', background: 'var(--bg)' }}
          title="Settings"
        >
          <GearIcon />
        </button>
      </div>

      {/* Chart area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {viewMode === 'raw' ? (
          <RawView logFile={logFile} />
        ) : viewMode === 'split' ? (
          <SplitView />
        ) : (
          <SingleView />
        )}
      </div>

      {/* Channel list */}
      <ChannelList />

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function SingleView() {
  const { logFile } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(400)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      if (containerRef.current) setH(containerRef.current.clientHeight - 16)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (!logFile) return null
  return (
    <div ref={containerRef} className="flex-1 p-2 overflow-hidden" style={{ minHeight: 0 }}>
      <Chart logFile={logFile} height={h} />
    </div>
  )
}

function SplitView() {
  const { logFile } = useStore()
  if (!logFile) return null
  const visible = logFile.channels.filter((c) => c.visible)

  if (visible.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm" style={{ color: 'var(--text-muted)' }}>
        Select channels below
      </div>
    )
  }

  // Split into individual channel files
  const splitFiles = visible.map((ch) => ({
    ...logFile,
    channels: logFile.channels.map((c) => ({ ...c, visible: c.name === ch.name }))
  }))

  return (
    <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: 'var(--border)' }}>
      {splitFiles.map((sf, i) => (
        <div key={i} className="p-3" style={{ minHeight: 200 }}>
          <div className="text-xs mb-1 font-medium" style={{ color: visible[i].color }}>
            {visible[i].name}{visible[i].unit ? ` (${visible[i].unit})` : ''}
          </div>
          <Chart logFile={sf} height={160} />
        </div>
      ))}
    </div>
  )
}

function RawView({ logFile }: { logFile: ReturnType<typeof useStore>['logFile'] }) {
  if (!logFile) return null
  const cols = ['Time', ...logFile.channels.map((c) => c.unit ? `${c.name} (${c.unit})` : c.name)]
  const maxRows = 1000

  return (
    <div className="flex-1 overflow-auto font-mono text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ background: 'var(--surface)', position: 'sticky', top: 0 }}>
            {cols.map((c) => (
              <th
                key={c}
                className="text-left px-3 py-2 whitespace-nowrap"
                style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logFile.timestamps.slice(0, maxRows).map((t, i) => (
            <tr
              key={i}
              style={{ borderBottom: '1px solid var(--border)' }}
              className="hover:bg-white/5 transition-colors"
            >
              <td className="px-3 py-1 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{t.toFixed(3)}</td>
              {logFile.channels.map((c) => (
                <td key={c.name} className="px-3 py-1 whitespace-nowrap" style={{ color: 'var(--text)' }}>
                  {isNaN(c.data[i]) ? '—' : c.data[i].toFixed(3)}
                </td>
              ))}
            </tr>
          ))}
          {logFile.rowCount > maxRows && (
            <tr>
              <td colSpan={cols.length} className="px-3 py-2 text-center" style={{ color: 'var(--text-muted)' }}>
                Showing first {maxRows} of {logFile.rowCount.toLocaleString()} rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const GearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
