import { useState, useRef } from 'react'
import { useStore } from '../store'
import { DEFAULT_CHANNEL_COLORS } from '../themes'
import type { PanelPosition } from '../types'

interface ChannelListProps {
  position: PanelPosition
  panelSize?: number
}

export default function ChannelList({ position, panelSize }: ChannelListProps) {
  const { logFile, toggleChannel, setChannelColor } = useStore()
  const [search, setSearch] = useState('')
  const [pickerFor, setPickerFor] = useState<string | null>(null)

  if (!logFile) return null

  const filtered = logFile.channels.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.unit.toLowerCase().includes(search.toLowerCase())
  )

  const activeCount = logFile.channels.filter((c) => c.visible).length
  const isVertical = position === 'left' || position === 'right'

  const border: React.CSSProperties = {
    borderTop:    position === 'bottom' ? '1px solid var(--border)' : undefined,
    borderBottom: position === 'top'    ? '1px solid var(--border)' : undefined,
    borderLeft:   position === 'right'  ? '1px solid var(--border)' : undefined,
    borderRight:  position === 'left'   ? '1px solid var(--border)' : undefined
  }

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        width:  isVertical ? (panelSize ?? 220) : undefined,
        height: isVertical ? undefined : (panelSize ?? 130),
        ...border
      }}
    >
      {/* Search / header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: isVertical ? '10px 12px' : '6px 12px',
          flexShrink: 0,
          borderBottom: '1px solid var(--border)'
        }}
      >
        <SearchIcon />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          style={{
            flex: 1,
            minWidth: 0,
            fontSize: 11,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)'
          }}
        />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {activeCount}/{logFile.channels.length}
        </span>
      </div>

      {/* Channel items */}
      {isVertical ? (
        <VerticalList
          channels={filtered}
          pickerFor={pickerFor}
          setPickerFor={setPickerFor}
          toggleChannel={toggleChannel}
          setChannelColor={setChannelColor}
          position={position}
        />
      ) : (
        <HorizontalList
          channels={filtered}
          pickerFor={pickerFor}
          setPickerFor={setPickerFor}
          toggleChannel={toggleChannel}
          setChannelColor={setChannelColor}
        />
      )}
    </div>
  )
}

// ─── Horizontal (top / bottom) ───────────────────────────────────────────────

function HorizontalList({ channels, pickerFor, setPickerFor, toggleChannel, setChannelColor }: ListProps) {
  return (
    <div
      style={{
        flex: 1,
        overflowX: 'auto',
        overflowY: 'hidden',
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', minWidth: 'max-content' }}>
        {channels.map((ch) => (
          <ChannelChip
            key={ch.name}
            ch={ch}
            pickerFor={pickerFor}
            setPickerFor={setPickerFor}
            toggleChannel={toggleChannel}
            setChannelColor={setChannelColor}
            popupDir="up"
          />
        ))}
      </div>
    </div>
  )
}

// ─── Vertical (left / right) ─────────────────────────────────────────────────

function VerticalList({ channels, pickerFor, setPickerFor, toggleChannel, setChannelColor, position }: ListProps & { position: PanelPosition }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0' }}>
      {channels.map((ch) => (
        <div
          key={ch.name}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 12px',
            cursor: 'pointer',
            borderLeft: ch.visible ? `3px solid ${ch.color}` : '3px solid transparent',
            background: ch.visible ? `${ch.color}0d` : 'transparent',
            transition: 'background 0.15s'
          }}
          onClick={() => toggleChannel(ch.name)}
        >
          {/* Color dot */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <span
              onClick={(e) => {
                e.stopPropagation()
                setPickerFor(pickerFor === ch.name ? null : ch.name)
              }}
              style={{
                display: 'block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: ch.color,
                cursor: 'pointer',
                flexShrink: 0
              }}
            />
            {pickerFor === ch.name && (
              <ColorPicker
                current={ch.color}
                onPick={(c) => { setChannelColor(ch.name, c); setPickerFor(null) }}
                onClose={() => setPickerFor(null)}
                popupDir={position === 'left' ? 'right' : 'left'}
              />
            )}
          </div>

          {/* Name + unit */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: ch.visible ? 600 : 400,
                color: ch.visible ? ch.color : 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.3
              }}
            >
              {ch.name}
            </div>
            {ch.unit && (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.6, lineHeight: 1 }}>
                {ch.unit}
              </div>
            )}
          </div>

          {/* Min/max */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {ch.max.toFixed(1)}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', opacity: 0.5, lineHeight: 1.4 }}>
              {ch.min.toFixed(1)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Chip (horizontal mode) ───────────────────────────────────────────────────

interface ListProps {
  channels: ReturnType<typeof useStore>['logFile'] extends null ? never : NonNullable<ReturnType<typeof useStore>['logFile']>['channels']
  pickerFor: string | null
  setPickerFor: (n: string | null) => void
  toggleChannel: (n: string) => void
  setChannelColor: (n: string, c: string) => void
}

function ChannelChip({ ch, pickerFor, setPickerFor, toggleChannel, setChannelColor, popupDir }: ListProps['channels'][number] extends never ? never : {
  ch: NonNullable<ReturnType<typeof useStore>['logFile']>['channels'][number]
  pickerFor: string | null
  setPickerFor: (n: string | null) => void
  toggleChannel: (n: string) => void
  setChannelColor: (n: string, c: string) => void
  popupDir: 'up' | 'down'
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => toggleChannel(ch.name)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 20,
          border: `1px solid ${ch.visible ? ch.color : 'var(--border)'}`,
          background: ch.visible ? `${ch.color}18` : 'var(--bg)',
          color: ch.visible ? ch.color : 'var(--text-muted)',
          fontSize: 11,
          fontWeight: ch.visible ? 600 : 400,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          transition: 'border-color 0.15s, background 0.15s, color 0.15s'
        }}
      >
        <span
          onClick={(e) => {
            e.stopPropagation()
            setPickerFor(pickerFor === ch.name ? null : ch.name)
          }}
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: ch.color,
            display: 'inline-block',
            flexShrink: 0,
            cursor: 'pointer'
          }}
        />
        {ch.name}
        {ch.unit && (
          <span style={{ opacity: 0.55, fontSize: 10 }}>({ch.unit})</span>
        )}
      </button>

      {pickerFor === ch.name && (
        <ColorPicker
          current={ch.color}
          onPick={(c) => { setChannelColor(ch.name, c); setPickerFor(null) }}
          onClose={() => setPickerFor(null)}
          popupDir={popupDir === 'up' ? 'up' : 'down'}
        />
      )}
    </div>
  )
}

// ─── Color picker ─────────────────────────────────────────────────────────────

function ColorPicker({
  current,
  onPick,
  onClose,
  popupDir = 'up'
}: {
  current: string
  onPick: (c: string) => void
  onClose: () => void
  popupDir?: 'up' | 'down' | 'left' | 'right'
}) {
  const pos: React.CSSProperties =
    popupDir === 'up'    ? { bottom: '100%', left: 0, marginBottom: 6 } :
    popupDir === 'down'  ? { top: '100%',    left: 0, marginTop: 6 } :
    popupDir === 'right' ? { left: '100%',   top: 0,  marginLeft: 6 } :
                           { right: '100%',  top: 0,  marginRight: 6 }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div
        style={{
          position: 'absolute',
          zIndex: 50,
          padding: 8,
          borderRadius: 10,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 5,
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          ...pos
        }}
      >
        {DEFAULT_CHANNEL_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: c,
              border: 'none',
              cursor: 'pointer',
              outline: c === current ? '2px solid #fff' : 'none',
              outlineOffset: 1,
              transform: 'scale(1)',
              transition: 'transform 0.1s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          />
        ))}
      </div>
    </>
  )
}

const SearchIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
)
