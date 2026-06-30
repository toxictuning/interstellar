import { useState, useRef } from 'react'
import { useStore } from '../store'
import { DEFAULT_CHANNEL_COLORS } from '../themes'

export default function ChannelList() {
  const { logFile, toggleChannel, setChannelColor } = useStore()
  const [search, setSearch] = useState('')
  const [pickerFor, setPickerFor] = useState<string | null>(null)

  if (!logFile) return null

  const filtered = logFile.channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.unit.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className="shrink-0 flex flex-col"
      style={{
        height: 140,
        borderTop: '1px solid var(--border)',
        background: 'var(--surface)'
      }}
    >
      {/* Search row */}
      <div className="flex items-center gap-2 px-3 py-2 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search channels..."
          className="flex-1 text-xs outline-none bg-transparent"
          style={{ color: 'var(--text)' }}
        />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {logFile.channels.filter((c) => c.visible).length} active / {logFile.channels.length} total
        </span>
      </div>

      {/* Channel chips */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center gap-2 px-3">
        <div className="flex items-center gap-2 h-full py-2" style={{ minWidth: 'max-content' }}>
          {filtered.map((ch) => (
            <div key={ch.name} className="relative">
              <button
                onClick={() => toggleChannel(ch.name)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all"
                style={{
                  background: ch.visible ? ch.color + '22' : 'var(--bg)',
                  border: `1px solid ${ch.visible ? ch.color : 'var(--border)'}`,
                  color: ch.visible ? ch.color : 'var(--text-muted)'
                }}
              >
                <ColorDot
                  color={ch.color}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPickerFor(pickerFor === ch.name ? null : ch.name)
                  }}
                />
                <span>{ch.name}</span>
                {ch.unit && (
                  <span style={{ opacity: 0.6, fontSize: 10 }}>({ch.unit})</span>
                )}
              </button>

              {pickerFor === ch.name && (
                <ColorPicker
                  current={ch.color}
                  onPick={(c) => {
                    setChannelColor(ch.name, c)
                    setPickerFor(null)
                  }}
                  onClose={() => setPickerFor(null)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ColorDot({ color, onClick }: { color: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <span
      onClick={onClick}
      className="inline-block w-2.5 h-2.5 rounded-full cursor-pointer hover:scale-125 transition-transform"
      style={{ background: color, flexShrink: 0 }}
    />
  )
}

function ColorPicker({
  current,
  onPick,
  onClose
}: {
  current: string
  onPick: (c: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        ref={ref}
        className="absolute bottom-full mb-2 left-0 z-50 p-2 rounded-xl grid gap-1.5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          gridTemplateColumns: 'repeat(5, 1fr)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}
      >
        {DEFAULT_CHANNEL_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            className="w-5 h-5 rounded-full hover:scale-125 transition-transform"
            style={{
              background: c,
              outline: c === current ? `2px solid #fff` : 'none',
              outlineOffset: 1
            }}
          />
        ))}
      </div>
    </>
  )
}
