import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { parseCSV } from '../csvParser'
import Chart from './Chart'
import ChannelList from './ChannelList'
import SettingsPanel from './SettingsPanel'
import { BRAND_RED } from '../themes'
import type { ViewMode } from '../types'

export default function LogViewer() {
  const { logFile, viewMode, setViewMode, setLogFile, settings } = useStore()
  const [showSettings, setShowSettings] = useState(false)

  if (!logFile) return null

  const pos = settings.channelListPosition
  const isVerticalPanel = pos === 'left' || pos === 'right'

  const openNew = async () => {
    const path = await window.api.openFileDialog()
    if (!path) return
    const res = await window.api.readFile(path)
    if (res.ok && res.content) {
      const parsed = parseCSV(res.content, path)
      if (parsed) setLogFile(parsed)
    }
  }

  const channelList = <ChannelList position={pos} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 14px',
          height: 44,
          flexShrink: 0,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)'
        }}
      >
        <ToolbarBtn onClick={() => setLogFile(null)} title="Back to home">← Back</ToolbarBtn>
        <ToolbarBtn onClick={openNew}>Open</ToolbarBtn>

        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {logFile.rowCount.toLocaleString()} rows · {logFile.channels.length} ch
        </span>

        <div style={{ flex: 1 }} />

        {/* View mode tabs */}
        <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)' }}>
          {(['single', 'split', 'raw'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                padding: '3px 11px',
                borderRadius: 4,
                border: 'none',
                background: viewMode === m ? BRAND_RED : 'transparent',
                color: viewMode === m ? '#fff' : 'var(--text-muted)',
                fontSize: 11,
                fontWeight: viewMode === m ? 700 : 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s'
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSettings(true)}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 6,
            border: 'none',
            background: 'var(--bg)',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
          title="Settings"
        >
          <GearIcon />
        </button>
      </div>

      {/* Body: channel list can be top/bottom/left/right */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: isVerticalPanel ? 'row' : 'column' }}>
        {pos === 'top' && channelList}
        {pos === 'left' && channelList}

        {/* Chart area */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {viewMode === 'raw' ? (
            <RawView logFile={logFile} />
          ) : viewMode === 'split' ? (
            <SplitView />
          ) : (
            <SingleView />
          )}
        </div>

        {pos === 'right' && channelList}
        {pos === 'bottom' && channelList}
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  )
}

function ToolbarBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        padding: '4px 8px',
        borderRadius: 5,
        border: 'none',
        background: 'var(--bg)',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'color 0.15s'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      {children}
    </button>
  )
}

function SingleView() {
  const { logFile } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(400)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      if (containerRef.current) setH(Math.max(100, containerRef.current.clientHeight - 8))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (!logFile) return null
  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0, padding: '4px 6px 0', overflow: 'hidden' }}>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', fontSize: 13 }}>
        Select channels to compare
      </div>
    )
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
      {visible.map((ch) => {
        const sf = { ...logFile, channels: logFile.channels.map((c) => ({ ...c, visible: c.name === ch.name })) }
        return (
          <div key={ch.name} style={{ padding: '6px 8px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: ch.color, marginBottom: 2, paddingLeft: 2 }}>
              {ch.name}{ch.unit ? ` (${ch.unit})` : ''}
            </div>
            <Chart logFile={sf} height={168} />
          </div>
        )
      })}
    </div>
  )
}

function RawView({ logFile }: { logFile: NonNullable<ReturnType<typeof useStore>['logFile']> }) {
  const cols = ['Time', ...logFile.channels.map((c) => c.unit ? `${c.name} (${c.unit})` : c.name)]
  const maxRows = 1000

  return (
    <div style={{ flex: 1, overflow: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 1 }}>
            {cols.map((c) => (
              <th
                key={c}
                style={{
                  textAlign: 'left', padding: '7px 12px',
                  whiteSpace: 'nowrap', fontWeight: 600,
                  borderBottom: '1px solid var(--border)', color: 'var(--text-muted)'
                }}
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
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <td style={{ padding: '4px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.toFixed(3)}</td>
              {logFile.channels.map((c) => (
                <td key={c.name} style={{ padding: '4px 12px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                  {isNaN(c.data[i]) ? '—' : c.data[i].toFixed(3)}
                </td>
              ))}
            </tr>
          ))}
          {logFile.rowCount > maxRows && (
            <tr>
              <td colSpan={cols.length} style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Showing first {maxRows.toLocaleString()} of {logFile.rowCount.toLocaleString()} rows
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
