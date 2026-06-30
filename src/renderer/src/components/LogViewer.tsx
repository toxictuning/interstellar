import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { parseCSV } from '../csvParser'
import Chart, { type ChartHandle } from './Chart'
import ChannelList from './ChannelList'
import SettingsPanel from './SettingsPanel'
import AboutDialog from './AboutDialog'
import { BRAND_RED } from '../themes'
import type { ViewMode, PanelPosition } from '../types'

export default function LogViewer() {
  const { logFile, viewMode, setViewMode, setLogFile, settings } = useStore()
  const [showSettings, setShowSettings] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const pos = settings.channelListPosition
  const isVertical = pos === 'left' || pos === 'right'

  // Panel size — separate defaults for vertical vs horizontal
  const [panelSize, setPanelSize] = useState(220)
  const prevPos = useRef<PanelPosition>(pos)
  useEffect(() => {
    if (prevPos.current !== pos) {
      prevPos.current = pos
      setPanelSize(isVertical ? 220 : 130)
    }
  }, [pos, isVertical])

  // Chart ref for PNG export
  const chartRef = useRef<ChartHandle>(null)

  // Smoothing — stored as half-window radius (0 = raw, max 50)
  const [smoothing, setSmoothing] = useState(0)
  // Y-axis pin — one channel name whose range locks the Y scale
  const [yAxisChannel, setYAxisChannel] = useState<string | null>(null)
  // X-axis channel — switches the chart into XY plot mode
  const [xAxisChannel, setXAxisChannel] = useState<string | null>(null)

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

  const exportPng = () => {
    if (viewMode !== 'single') return
    const base = logFile.name.replace(/\.csv$/i, '')
    chartRef.current?.exportPng(`${base}.png`)
  }

  const channelList = <ChannelList position={pos} panelSize={panelSize} yAxisChannel={yAxisChannel} onSetYAxis={setYAxisChannel} xAxisChannel={xAxisChannel} onSetXAxis={setXAxisChannel} />

  const resizeHandle = (
    <ResizeHandle
      direction={isVertical ? 'col' : 'row'}
      invert={pos === 'right' || pos === 'bottom'}
      currentSize={panelSize}
      minSize={isVertical ? 140 : 80}
      maxSize={isVertical ? 480 : 280}
      onResize={setPanelSize}
    />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '0 12px', height: 44, flexShrink: 0,
        borderBottom: '1px solid var(--border)', background: 'var(--surface)'
      }}>
        <ToolbarBtn onClick={() => setLogFile(null)} title="Back to home">← Back</ToolbarBtn>
        <ToolbarBtn onClick={openNew}>Open</ToolbarBtn>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.7 }}>
          {logFile.rowCount.toLocaleString()} rows · {logFile.channels.length} ch
        </span>

        <div style={{ flex: 1 }} />

        <SmoothSlider value={smoothing} onChange={setSmoothing} />

        {/* Export PNG — only in single view */}
        {viewMode === 'single' && (
          <ToolbarBtn onClick={exportPng} title="Export chart as PNG">
            <ExportIcon /> PNG
          </ToolbarBtn>
        )}

        {/* View mode tabs */}
        <div style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border)' }}>
          {(['single', 'split', 'raw'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              style={{
                padding: '3px 11px', borderRadius: 4, border: 'none',
                background: viewMode === m ? BRAND_RED : 'transparent',
                color: viewMode === m ? '#fff' : 'var(--text-muted)',
                fontSize: 11, fontWeight: viewMode === m ? 700 : 500,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer', transition: 'background 0.15s, color 0.15s'
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowAbout(true)}
          style={{
            width: 28, height: 28, display: 'flex', alignItems: 'center',
            justifyContent: 'center', borderRadius: '50%', border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
            fontSize: 11, fontWeight: 700, letterSpacing: 0
          }}
          title="About Interstellar"
        >
          i
        </button>
        <button
          onClick={() => setShowSettings(true)}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center',
            justifyContent: 'center', borderRadius: 6, border: 'none',
            background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer'
          }}
          title="Settings"
        >
          <GearIcon />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: isVertical ? 'row' : 'column' }}>
        {pos === 'top'  && <>{channelList}{resizeHandle}</>}
        {pos === 'left' && <>{channelList}{resizeHandle}</>}

        {/* Chart area */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {viewMode === 'raw'    ? <RawView   logFile={logFile} /> :
           viewMode === 'split'  ? <SplitView smoothing={smoothing} yAxisChannel={yAxisChannel} xAxisChannel={xAxisChannel} /> :
                                   <SingleView chartRef={chartRef} smoothing={smoothing} yAxisChannel={yAxisChannel} xAxisChannel={xAxisChannel} onResetYAxis={() => setYAxisChannel(null)} onResetXAxis={() => setXAxisChannel(null)} />}
        </div>

        {pos === 'right'  && <>{resizeHandle}{channelList}</>}
        {pos === 'bottom' && <>{resizeHandle}{channelList}</>}
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showAbout    && <AboutDialog   onClose={() => setShowAbout(false)} />}
    </div>
  )
}

// ─── Resize handle ────────────────────────────────────────────────────────────

function ResizeHandle({
  direction, invert, currentSize, minSize, maxSize, onResize
}: {
  direction: 'col' | 'row'
  invert: boolean
  currentSize: number
  minSize: number
  maxSize: number
  onResize: (size: number) => void
}) {
  const [active, setActive] = useState(false)

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setActive(true)
    const startPos  = direction === 'col' ? e.clientX : e.clientY
    const startSize = currentSize

    const onMove = (me: MouseEvent) => {
      const currentPos = direction === 'col' ? me.clientX : me.clientY
      const delta = (currentPos - startPos) * (invert ? -1 : 1)
      onResize(Math.max(minSize, Math.min(maxSize, startSize + delta)))
    }
    const onUp = () => {
      setActive(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const isCol = direction === 'col'
  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={(e) => { if (e.buttons === 0) setActive(false) }}
      style={{
        flexShrink: 0,
        width:  isCol ? 4 : '100%',
        height: isCol ? '100%' : 4,
        cursor: isCol ? 'col-resize' : 'row-resize',
        background: active ? BRAND_RED : 'var(--border)',
        transition: 'background 0.15s',
        position: 'relative',
        zIndex: 5
      }}
    />
  )
}

// ─── Views ────────────────────────────────────────────────────────────────────

function SingleView({ chartRef, smoothing, yAxisChannel, xAxisChannel, onResetYAxis, onResetXAxis }: {
  chartRef: React.Ref<ChartHandle>
  smoothing: number
  yAxisChannel: string | null
  xAxisChannel: string | null
  onResetYAxis: () => void
  onResetXAxis: () => void
}) {
  const { logFile } = useStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(400)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(() => {
      if (containerRef.current) setH(Math.max(100, containerRef.current.clientHeight - 8))
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  if (!logFile) return null

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!yAxisChannel && !xAxisChannel) return
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }

  const menuItems = [
    ...(xAxisChannel ? [{ label: `Reset X Axis (${xAxisChannel})`, onClick: () => { onResetXAxis(); setCtxMenu(null) } }] : []),
    ...(yAxisChannel ? [{ label: `Reset Y Axis (${yAxisChannel})`, onClick: () => { onResetYAxis(); setCtxMenu(null) } }] : []),
  ]

  return (
    <div ref={containerRef} style={{ flex: 1, minHeight: 0, padding: '4px 6px 0', overflow: 'hidden' }}
      onContextMenu={handleContextMenu}>
      <Chart ref={chartRef} logFile={logFile} height={h} smoothing={smoothing} yAxisChannel={yAxisChannel} xAxisChannel={xAxisChannel} />
      {ctxMenu && menuItems.length > 0 && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={menuItems} onClose={() => setCtxMenu(null)} />
      )}
    </div>
  )
}

function SplitView({ smoothing, yAxisChannel, xAxisChannel }: { smoothing: number; yAxisChannel: string | null; xAxisChannel: string | null }) {
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
            <Chart logFile={sf} height={168} smoothing={smoothing} yAxisChannel={yAxisChannel} xAxisChannel={xAxisChannel} />
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
              <th key={c} style={{ textAlign: 'left', padding: '7px 12px', whiteSpace: 'nowrap', fontWeight: 600, borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
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

// ─── Small components ─────────────────────────────────────────────────────────

function ToolbarBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 11, padding: '4px 8px', borderRadius: 5,
        border: 'none', background: 'var(--bg)', color: 'var(--text-muted)',
        cursor: 'pointer', transition: 'color 0.15s', letterSpacing: '0.03em'
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
    >
      {children}
    </button>
  )
}

function SmoothSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const MAX = 50
  const pct = value / MAX

  const update = (clientX: number) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    onChange(Math.round(ratio * MAX))
  }

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    update(e.clientX)
    const onMove = (me: MouseEvent) => update(me.clientX)
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const active = value > 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
      <span style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', userSelect: 'none' }}>
        Smooth
      </span>
      <div
        ref={trackRef}
        onMouseDown={onMouseDown}
        style={{ width: 72, height: 16, position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
      >
        {/* Track */}
        <div style={{ position: 'absolute', left: 0, right: 0, height: 3, borderRadius: 2, background: 'var(--border)' }} />
        {/* Fill */}
        {active && (
          <div style={{
            position: 'absolute', left: 0, width: `${pct * 100}%`,
            height: 3, borderRadius: 2,
            background: `linear-gradient(to right, rgba(229,0,10,0.4), ${BRAND_RED})`
          }} />
        )}
        {/* Thumb */}
        <div style={{
          position: 'absolute',
          left: `${pct * 100}%`,
          transform: 'translateX(-50%)',
          width: 10, height: 10, borderRadius: '50%',
          background: active ? BRAND_RED : 'var(--axis)',
          boxShadow: active ? `0 0 6px rgba(229,0,10,0.6)` : 'none',
          transition: 'background 0.15s, box-shadow 0.15s',
          pointerEvents: 'none'
        }} />
      </div>
      <span style={{
        fontSize: 10, minWidth: 14, textAlign: 'right',
        color: active ? BRAND_RED : 'var(--text-muted)',
        opacity: active ? 1 : 0.4,
        transition: 'color 0.15s, opacity 0.15s',
        userSelect: 'none'
      }}>
        {value === 0 ? 'off' : value}
      </span>
    </div>
  )
}

function ContextMenu({ x, y, items, onClose }: {
  x: number; y: number
  items: { label: string; onClick: () => void }[]
  onClose: () => void
}) {
  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 499 }}
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose() }}
      />
      <div style={{
        position: 'fixed', top: y, left: x, zIndex: 500,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 7, boxShadow: '0 10px 32px rgba(0,0,0,0.7)',
        overflow: 'hidden', minWidth: 160
      }}>
        {items.map((item) => (
          <button
            key={item.label}
            onClick={(e) => { e.stopPropagation(); item.onClick() }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '8px 14px', border: 'none', background: 'transparent',
              color: 'var(--text)', fontSize: 12, cursor: 'pointer'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}

const ExportIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const GearIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)
