import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { DEFAULT_CHANNEL_COLORS, BRAND_RED } from '../themes'
import type { PanelPosition, ChannelPreset, LogFile, LogChannel } from '../types'

interface ChannelListProps {
  position: PanelPosition
  panelSize?: number
  yAxisChannel?: string | null
  onSetYAxis?: (name: string | null) => void
  xAxisChannel?: string | null
  onSetXAxis?: (name: string | null) => void
}

export default function ChannelList({ position, panelSize, yAxisChannel, onSetYAxis, xAxisChannel, onSetXAxis }: ChannelListProps) {
  const {
    logFile, toggleChannel, setChannelColor,
    channelPresets, saveChannelPreset, deleteChannelPreset, applyChannelPreset
  } = useStore()

  const [search,      setSearch]      = useState('')
  const [pickerFor,   setPickerFor]   = useState<string | null>(null)
  const [showSave,    setShowSave]    = useState(false)
  const [presetRect,  setPresetRect]  = useState<DOMRect | null>(null)
  const [ctxMenu,     setCtxMenu]     = useState<{ x: number; y: number; name: string } | null>(null)
  const presetBtnRef = useRef<HTMLButtonElement>(null)

  if (!logFile) return null

  const filtered    = logFile.channels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.unit.toLowerCase().includes(search.toLowerCase())
  )
  const activeCount     = logFile.channels.filter((c) => c.visible).length
  const visibleChannels = logFile.channels.filter((c) => c.visible)
  const isVertical      = position === 'left' || position === 'right'

  const border: React.CSSProperties = {
    borderTop:    position === 'bottom' ? '1px solid var(--border)' : undefined,
    borderBottom: position === 'top'    ? '1px solid var(--border)' : undefined,
    borderLeft:   position === 'right'  ? '1px solid var(--border)' : undefined,
    borderRight:  position === 'left'   ? '1px solid var(--border)' : undefined
  }

  const togglePresetDropdown = () => {
    if (presetRect) { setPresetRect(null); return }
    const r = presetBtnRef.current?.getBoundingClientRect()
    if (r) setPresetRect(r)
  }

  return (
    <div style={{
      flexShrink: 0, display: 'flex', flexDirection: 'column',
      background: 'var(--surface)',
      width:  isVertical ? (panelSize ?? 220) : undefined,
      height: isVertical ? undefined : (panelSize ?? 130),
      ...border
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: isVertical ? '10px 10px' : '6px 10px',
        flexShrink: 0, borderBottom: '1px solid var(--border)'
      }}>
        <SearchIcon />
        <input
          type="text" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          style={{ flex: 1, minWidth: 0, fontSize: 11, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)' }}
        />
        <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {activeCount}/{logFile.channels.length}
        </span>

        {/* Divider */}
        <div style={{ width: 1, height: 12, background: 'var(--border)', flexShrink: 0 }} />

        {/* Save preset */}
        <SmallIconBtn onClick={() => setShowSave(true)} title="Save channel selection">
          <BookmarkIcon />
        </SmallIconBtn>

        {/* Load presets */}
        <SmallIconBtn
          ref={presetBtnRef}
          onClick={togglePresetDropdown}
          title="Load channel selection"
          active={!!presetRect}
        >
          <LayersIcon />
          {channelPresets.length > 0 && (
            <span style={{
              position: 'absolute', top: 0, right: 0,
              width: 6, height: 6, borderRadius: '50%',
              background: BRAND_RED, border: '1px solid var(--surface)'
            }} />
          )}
        </SmallIconBtn>
      </div>

      {/* ── Channel items ── */}
      {isVertical ? (
        <VerticalList channels={filtered} pickerFor={pickerFor} setPickerFor={setPickerFor}
          toggleChannel={toggleChannel} setChannelColor={setChannelColor} position={position}
          yAxisChannel={yAxisChannel ?? null}
          xAxisChannel={xAxisChannel ?? null}
          onContextMenu={(name, x, y) => setCtxMenu({ x, y, name })} />
      ) : (
        <HorizontalList channels={filtered} pickerFor={pickerFor} setPickerFor={setPickerFor}
          toggleChannel={toggleChannel} setChannelColor={setChannelColor}
          yAxisChannel={yAxisChannel ?? null}
          xAxisChannel={xAxisChannel ?? null}
          onContextMenu={(name, x, y) => setCtxMenu({ x, y, name })} />
      )}

      {/* ── Channel right-click menu ── */}
      {ctxMenu && (onSetYAxis || onSetXAxis) && (
        <ChannelContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          name={ctxMenu.name}
          isYAxis={yAxisChannel === ctxMenu.name}
          isXAxis={xAxisChannel === ctxMenu.name}
          onSetYAxis={onSetYAxis ? () => { onSetYAxis(yAxisChannel === ctxMenu.name ? null : ctxMenu.name); setCtxMenu(null) } : undefined}
          onSetXAxis={onSetXAxis ? () => { onSetXAxis(xAxisChannel === ctxMenu.name ? null : ctxMenu.name); setCtxMenu(null) } : undefined}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* ── Modals ── */}
      {showSave && (
        <SavePresetModal
          visible={visibleChannels}
          onSave={(name, logger) => {
            saveChannelPreset(name, logger, visibleChannels.map((c) => c.name))
            setShowSave(false)
          }}
          onClose={() => setShowSave(false)}
        />
      )}

      {presetRect && (
        <PresetDropdown
          anchor={presetRect}
          presets={channelPresets}
          logFile={logFile}
          onApply={(id) => { applyChannelPreset(id); setPresetRect(null) }}
          onDelete={deleteChannelPreset}
          onClose={() => setPresetRect(null)}
        />
      )}
    </div>
  )
}

// ─── Save preset modal ────────────────────────────────────────────────────────

const QUICK_LOGGERS = ['VCDS', 'MoTeC', 'Haltech', 'AEM', 'Link', 'EcuMaster', 'MaxxECU']

function SavePresetModal({
  visible, onSave, onClose
}: {
  visible: LogChannel[]
  onSave: (name: string, logger: string) => void
  onClose: () => void
}) {
  const [name,   setName]   = useState('')
  const [logger, setLogger] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { nameRef.current?.focus() }, [])

  const canSave = name.trim().length > 0 && visible.length > 0

  const save = () => { if (canSave) onSave(name.trim(), logger.trim()) }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 301, width: 360,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 28px 72px rgba(0,0,0,0.85)'
      }}>
        <div style={{ height: 2, background: BRAND_RED }} />
        <div style={{ padding: '20px 20px 18px' }}>

          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 18 }}>
            Save Channel Selection
          </div>

          {/* Name */}
          <FieldLabel required>Selection name</FieldLabel>
          <input
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            placeholder="e.g. MED9 Boost"
            style={inputStyle}
          />

          {/* Logger */}
          <FieldLabel hint="optional">Logger</FieldLabel>
          <input
            value={logger}
            onChange={(e) => setLogger(e.target.value)}
            placeholder="Type or pick below…"
            style={{ ...inputStyle, marginBottom: 7 }}
          />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 18 }}>
            {QUICK_LOGGERS.map((l) => (
              <button
                key={l}
                onClick={() => setLogger(l === logger ? '' : l)}
                style={{
                  padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                  border: `1px solid ${logger === l ? BRAND_RED : 'var(--border)'}`,
                  background: logger === l ? 'rgba(229,0,10,0.14)' : 'transparent',
                  color: logger === l ? BRAND_RED : 'var(--text-muted)',
                  cursor: 'pointer', transition: 'all 0.12s'
                }}
              >{l}</button>
            ))}
          </div>

          {/* Channel preview */}
          <div style={{ background: 'var(--bg)', borderRadius: 7, padding: '9px 11px', marginBottom: 18 }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 7 }}>
              {visible.length > 0 ? `Saving ${visible.length} channel${visible.length !== 1 ? 's' : ''}` : 'No channels selected'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 112, overflowY: 'auto' }}>
              {visible.map((ch) => (
                <div key={ch.name} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: ch.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ch.name}{ch.unit ? ` (${ch.unit})` : ''}
                  </span>
                </div>
              ))}
              {visible.length === 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.55 }}>
                  Enable some channels first.
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button onClick={save} disabled={!canSave} style={{
              padding: '7px 18px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: 700,
              background: canSave ? BRAND_RED : 'rgba(229,0,10,0.3)',
              color: '#fff', cursor: canSave ? 'pointer' : 'default',
              transition: 'opacity 0.15s'
            }}>
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Presets dropdown ─────────────────────────────────────────────────────────

function PresetDropdown({
  anchor, presets, logFile, onApply, onDelete, onClose
}: {
  anchor: DOMRect
  presets: ChannelPreset[]
  logFile: LogFile | null
  onApply: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  // Sort by most-recently touched (lastUsedAt > 0 beats createdAt)
  const sorted = [...presets].sort((a, b) => {
    const aT = Math.max(a.lastUsedAt, a.createdAt)
    const bT = Math.max(b.lastUsedAt, b.createdAt)
    return bT - aT
  })

  const RECENT_MAX = 10
  const recentItems = sorted.slice(0, Math.min(RECENT_MAX, sorted.length))
  const recentIds   = new Set(recentItems.map((p) => p.id))
  const restItems   = sorted.filter((p) => !recentIds.has(p.id))

  // Group the rest by logger name
  const groups: Record<string, ChannelPreset[]> = {}
  for (const p of restItems) {
    const key = p.logger || 'Generic'
    ;(groups[key] ??= []).push(p)
  }

  // Per-preset channel-match against the open log file
  const logNames = logFile ? new Set(logFile.channels.map((c) => c.name)) : null
  const matchOf  = (p: ChannelPreset) =>
    logNames ? p.channels.filter((n) => logNames.has(n)).length : p.channels.length

  // Position: below the anchor button, left-aligned, flip left if near right edge
  const left = Math.min(anchor.left, window.innerWidth - 284)
  const top  = anchor.bottom + 4

  const renderRow = (p: ChannelPreset) => {
    const mc    = matchOf(p)
    const total = p.channels.length
    const full  = mc === total
    const none  = total > 0 && mc === 0

    return (
      <div
        key={p.id}
        onClick={() => !none && onApply(p.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 10px', cursor: none ? 'default' : 'pointer',
          opacity: none ? 0.35 : 1, borderRadius: 5, margin: '1px 4px',
          transition: 'background 0.1s'
        }}
        onMouseEnter={(e) => { if (!none) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        {/* Logger badge */}
        {p.logger ? (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
            padding: '1px 5px', borderRadius: 3,
            background: 'rgba(229,0,10,0.14)', color: BRAND_RED, flexShrink: 0
          }}>{p.logger}</span>
        ) : (
          <span style={{ width: 4, flexShrink: 0 }} />
        )}

        {/* Name */}
        <span style={{ flex: 1, fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {p.name}
        </span>

        {/* Channel match count */}
        <span style={{
          fontSize: 10, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
          color: none ? 'var(--text-muted)' : full ? '#4ade80' : '#fbbf24'
        }}>
          {logNames ? (full ? `${total} ch` : `${mc}/${total}`) : `${total} ch`}
        </span>

        {/* Delete */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}
          style={{
            width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent', color: 'var(--text-muted)',
            cursor: 'pointer', borderRadius: 3, fontSize: 13, flexShrink: 0, padding: 0, lineHeight: 1
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = BRAND_RED; e.currentTarget.style.background = 'rgba(229,0,10,0.12)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
        >×</button>
      </div>
    )
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300 }} />
      <div style={{
        position: 'fixed', top, left,
        zIndex: 301, width: 280,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, overflow: 'hidden',
        boxShadow: '0 18px 52px rgba(0,0,0,0.75)',
        maxHeight: 420, display: 'flex', flexDirection: 'column'
      }}>
        {/* Red top stripe */}
        <div style={{ height: 2, background: BRAND_RED, flexShrink: 0 }} />

        {presets.length === 0 ? (
          <div style={{ padding: '22px 14px', textAlign: 'center' }}>
            <LayersIcon />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, opacity: 0.7 }}>No saved selections yet.</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, opacity: 0.45 }}>
              Use the bookmark button to save one.
            </div>
          </div>
        ) : (
          <div style={{ overflowY: 'auto', padding: '4px 0 6px' }}>
            {/* RECENT */}
            <SectionLabel>Recent</SectionLabel>
            {recentItems.map(renderRow)}

            {/* Per-logger groups */}
            {Object.entries(groups).map(([logger, items]) => (
              <React.Fragment key={logger}>
                <SectionLabel>{logger}</SectionLabel>
                {items.map(renderRow)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--text-muted)', padding: '8px 14px 3px', opacity: 0.5,
      borderTop: '1px solid var(--border)', marginTop: 4
    }}>
      {children}
    </div>
  )
}

// ─── Horizontal (top / bottom) ───────────────────────────────────────────────

function HorizontalList({ channels, pickerFor, setPickerFor, toggleChannel, setChannelColor, yAxisChannel, xAxisChannel, onContextMenu }: ListProps) {
  return (
    <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', display: 'flex', alignItems: 'center', padding: '0 10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', minWidth: 'max-content' }}>
        {channels.map((ch) => (
          <ChannelChip
            key={ch.name} ch={ch} pickerFor={pickerFor} setPickerFor={setPickerFor}
            toggleChannel={toggleChannel} setChannelColor={setChannelColor} popupDir="up"
            isYAxis={yAxisChannel === ch.name}
            isXAxis={xAxisChannel === ch.name}
            onContextMenu={onContextMenu}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Vertical (left / right) ─────────────────────────────────────────────────

function VerticalList({ channels, pickerFor, setPickerFor, toggleChannel, setChannelColor, position, yAxisChannel, xAxisChannel, onContextMenu }: ListProps & { position: PanelPosition }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0' }}>
      {channels.map((ch) => {
        const isYAxis = yAxisChannel === ch.name
        const isXAxis = xAxisChannel === ch.name
        return (
          <div
            key={ch.name}
            onClick={() => toggleChannel(ch.name)}
            onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(ch.name, e.clientX, e.clientY) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px',
              cursor: 'pointer',
              borderLeft: ch.visible ? `3px solid ${ch.color}` : '3px solid transparent',
              background: isXAxis || isYAxis ? `${ch.color}20` : ch.visible ? `${ch.color}0d` : 'transparent',
              transition: 'background 0.15s'
            }}
          >
            {/* Color dot */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <span
                onClick={(e) => { e.stopPropagation(); setPickerFor(pickerFor === ch.name ? null : ch.name) }}
                style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: ch.color, cursor: 'pointer', flexShrink: 0 }}
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
              <div style={{
                fontSize: 'var(--ui-fs)', fontWeight: ch.visible ? 600 : 400,
                color: ch.visible ? ch.color : 'var(--text-muted)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3
              }}>
                {ch.name}
              </div>
              {ch.unit && (
                <div style={{ fontSize: 'var(--ui-fs-sm)', color: 'var(--text-muted)', opacity: 0.6, lineHeight: 1 }}>{ch.unit}</div>
              )}
            </div>

            {/* Axis badges */}
            {isXAxis && (
              <span style={{
                fontSize: 'var(--ui-fs-xs)', fontWeight: 800, padding: '1px 4px', borderRadius: 3,
                background: ch.color, color: '#000', letterSpacing: '0.05em', flexShrink: 0
              }}>X</span>
            )}
            {isYAxis && (
              <span style={{
                fontSize: 'var(--ui-fs-xs)', fontWeight: 800, padding: '1px 4px', borderRadius: 3,
                background: ch.color, color: '#000', letterSpacing: '0.05em', flexShrink: 0
              }}>Y</span>
            )}

            {/* Min / max */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 'var(--ui-fs-xs)', color: 'var(--text-muted)', lineHeight: 1.4 }}>{ch.max.toFixed(1)}</div>
              <div style={{ fontSize: 'var(--ui-fs-xs)', color: 'var(--text-muted)', opacity: 0.5, lineHeight: 1.4 }}>{ch.min.toFixed(1)}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Chip (horizontal) ────────────────────────────────────────────────────────

interface ListProps {
  channels: LogChannel[]
  pickerFor: string | null
  setPickerFor: (n: string | null) => void
  toggleChannel: (n: string) => void
  setChannelColor: (n: string, c: string) => void
  yAxisChannel?: string | null
  xAxisChannel?: string | null
  onContextMenu?: (name: string, x: number, y: number) => void
}

function ChannelChip({ ch, pickerFor, setPickerFor, toggleChannel, setChannelColor, popupDir, isYAxis, isXAxis, onContextMenu }: ListProps & { ch: LogChannel; popupDir: 'up' | 'down'; isYAxis?: boolean; isXAxis?: boolean }) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => toggleChannel(ch.name)}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(ch.name, e.clientX, e.clientY) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 20,
          border: `1px solid ${isXAxis || isYAxis ? ch.color : ch.visible ? ch.color : 'var(--border)'}`,
          background: isXAxis || isYAxis ? `${ch.color}28` : ch.visible ? `${ch.color}18` : 'var(--bg)',
          color: ch.visible ? ch.color : 'var(--text-muted)',
          fontSize: 'var(--ui-fs)', fontWeight: ch.visible ? 600 : 400, cursor: 'pointer',
          whiteSpace: 'nowrap', transition: 'border-color 0.15s, background 0.15s, color 0.15s'
        }}
      >
        <span
          onClick={(e) => { e.stopPropagation(); setPickerFor(pickerFor === ch.name ? null : ch.name) }}
          style={{ width: 7, height: 7, borderRadius: '50%', background: ch.color, display: 'inline-block', flexShrink: 0, cursor: 'pointer' }}
        />
        {ch.name}
        {ch.unit && <span style={{ opacity: 0.55, fontSize: 'var(--ui-fs-sm)' }}>({ch.unit})</span>}
        {isXAxis && <span style={{ fontSize: 'var(--ui-fs-xs)', fontWeight: 800, background: ch.color, color: '#000', borderRadius: 3, padding: '0 3px' }}>X</span>}
        {isYAxis && <span style={{ fontSize: 'var(--ui-fs-xs)', fontWeight: 800, background: ch.color, color: '#000', borderRadius: 3, padding: '0 3px' }}>Y</span>}
      </button>
      {pickerFor === ch.name && (
        <ColorPicker
          current={ch.color}
          onPick={(c) => { setChannelColor(ch.name, c); setPickerFor(null) }}
          onClose={() => setPickerFor(null)}
          popupDir={popupDir}
        />
      )}
    </div>
  )
}

// ─── Channel right-click context menu ────────────────────────────────────────

function ChannelContextMenu({ x, y, name, isYAxis, isXAxis, onSetYAxis, onSetXAxis, onClose }: {
  x: number; y: number; name: string; isYAxis: boolean; isXAxis: boolean
  onSetYAxis?: () => void; onSetXAxis?: () => void; onClose: () => void
}) {
  const menuItems = [
    ...(onSetXAxis ? [{ label: isXAxis ? 'Remove X Axis' : 'Set as X Axis', onClick: onSetXAxis }] : []),
    ...(onSetYAxis ? [{ label: isYAxis ? 'Remove Y Axis' : 'Set as Y Axis', onClick: onSetYAxis }] : []),
  ]

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
        overflow: 'hidden', minWidth: 170
      }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '7px 14px 4px', opacity: 0.55, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {name}
        </div>
        <div style={{ height: 1, background: 'var(--border)', margin: '0 8px 4px' }} />
        {menuItems.map((item) => (
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

// ─── Color picker ─────────────────────────────────────────────────────────────

function ColorPicker({ current, onPick, onClose, popupDir = 'up' }: {
  current: string; onPick: (c: string) => void; onClose: () => void; popupDir?: 'up' | 'down' | 'left' | 'right'
}) {
  const pos: React.CSSProperties =
    popupDir === 'up'    ? { bottom: '100%', left: 0, marginBottom: 6 } :
    popupDir === 'down'  ? { top: '100%',    left: 0, marginTop: 6 }    :
    popupDir === 'right' ? { left: '100%',   top: 0,  marginLeft: 6 }   :
                           { right: '100%',  top: 0,  marginRight: 6 }
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div style={{
        position: 'absolute', zIndex: 50, padding: 8, borderRadius: 10,
        background: 'var(--surface)', border: '1px solid var(--border)',
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5,
        boxShadow: '0 12px 40px rgba(0,0,0,0.6)', ...pos
      }}>
        {DEFAULT_CHANNEL_COLORS.map((c) => (
          <button
            key={c} onClick={() => onPick(c)}
            style={{
              width: 18, height: 18, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
              outline: c === current ? '2px solid #fff' : 'none', outlineOffset: 1,
              transform: 'scale(1)', transition: 'transform 0.1s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.25)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          />
        ))}
      </div>
    </>
  )
}

// ─── Small helpers ────────────────────────────────────────────────────────────

const SmallIconBtn = React.forwardRef<
  HTMLButtonElement,
  { onClick: () => void; title: string; active?: boolean; children: React.ReactNode }
>(function SmallIconBtn({ onClick, title, active, children }, ref) {
  return (
    <button
      ref={ref} onClick={onClick} title={title}
      style={{
        position: 'relative', width: 22, height: 22, padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        border: `1px solid ${active ? 'rgba(229,0,10,0.5)' : 'transparent'}`,
        borderRadius: 4,
        background: active ? 'rgba(229,0,10,0.12)' : 'transparent',
        color: active ? BRAND_RED : 'var(--text-muted)', cursor: 'pointer',
        transition: 'all 0.12s'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {children}
    </button>
  )
})

function FieldLabel({ children, required, hint }: { children: React.ReactNode; required?: boolean; hint?: string }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
      {children}
      {required && <span style={{ color: BRAND_RED, marginLeft: 2 }}>*</span>}
      {hint && <span style={{ opacity: 0.5, marginLeft: 4 }}>({hint})</span>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: 'var(--bg)', border: '1px solid var(--border)',
  borderRadius: 6, padding: '8px 10px', fontSize: 12,
  color: 'var(--text)', outline: 'none', marginBottom: 14
}

const cancelBtnStyle: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer'
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const SearchIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
)

const BookmarkIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
)

const LayersIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)
