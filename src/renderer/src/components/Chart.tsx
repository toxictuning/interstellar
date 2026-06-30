import React, { useEffect, useRef, useState, useCallback, useImperativeHandle } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import type { LogFile, LogChannel } from '../types'
import { BRAND_RED } from '../themes'
import logoSrc from '../assets/logo.png'
import { useStore } from '../store'

export interface ChartHandle {
  exportPng: (filename: string) => void
}

interface ChartProps {
  logFile: LogFile
  height?: number
  smoothing?: number  // half-window radius in samples (0 = raw)
}

const Chart = React.forwardRef<ChartHandle, ChartProps>(function Chart(
  { logFile, height = 400, smoothing = 0 },
  ref
) {
  const theme        = useStore((s) => s.settings.theme)
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef      = useRef<uPlot | null>(null)
  const logoImgRef   = useRef<HTMLImageElement | null>(null)
  const smoothingRef = useRef(smoothing)
  smoothingRef.current = smoothing

  // Pre-load the logo once so exportPng can draw it synchronously
  useEffect(() => {
    const img = new Image()
    img.onload = () => { logoImgRef.current = img }
    img.src = logoSrc
  }, [])

  const fullMin = logFile.timestamps[0]
  const fullMax = logFile.timestamps[logFile.timestamps.length - 1]

  const [viewMin, setViewMin] = useState(fullMin)
  const [viewMax, setViewMax] = useState(fullMax)

  const visibleChannels = logFile.channels.filter((c) => c.visible)
  const isZoomed = viewMin > fullMin + 1e-9 || viewMax < fullMax - 1e-9

  const onViewChange = useCallback((min: number, max: number) => {
    setViewMin(min)
    setViewMax(max)
  }, [])

  // Expose exportPng to parent via ref
  useImperativeHandle(ref, () => ({
    exportPng(filename: string) {
      const srcCanvas = plotRef.current?.ctx.canvas
      if (!srcCanvas) return

      const dpr = window.devicePixelRatio || 1

      // Composite chart onto a fresh canvas with opaque bg
      const out = document.createElement('canvas')
      out.width  = srcCanvas.width
      out.height = srcCanvas.height
      const ctx = out.getContext('2d')!
      ctx.fillStyle = getCSS('--chart-bg') || '#0a0b0f'
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.drawImage(srcCanvas, 0, 0)

      // ── Watermark stamp (bottom-right) ──────────────────────────────
      // Layout:
      //   ┌─[2px red bar]──────────────────────────┐
      //   │  [logo ~26px tall]                      │
      //   │  filename (small, muted)                │
      //   └─────────────────────────────────────────┘

      const outerPad  = Math.round(14 * dpr)   // margin from canvas edge
      const innerPadX = Math.round(10 * dpr)
      const innerPadY = Math.round(8  * dpr)
      const logoH     = Math.round(26 * dpr)
      const textSize  = Math.round(9  * dpr)
      const gap       = Math.round(5  * dpr)
      const barW      = Math.round(2.5 * dpr)
      const radius    = Math.round(5  * dpr)

      // Measure filename text
      const label = filename.replace(/\.png$/i, '')
      ctx.font = `500 ${textSize}px Inter, system-ui, sans-serif`
      const textW = ctx.measureText(label).width

      // Compute logo width (maintain aspect ratio)
      const logo    = logoImgRef.current
      const logoW   = logo ? Math.round(logo.naturalWidth * (logoH / logo.naturalHeight)) : 0
      const contentW = Math.max(logoW, textW)
      const panelW   = contentW + innerPadX * 2 + barW
      const panelH   = logoH + gap + textSize + innerPadY * 2

      const px = out.width  - panelW - outerPad
      const py = out.height - panelH - outerPad

      ctx.save()

      // Panel background (dark, slightly transparent)
      ctx.globalAlpha = 0.82
      ctx.fillStyle = '#08080c'
      ctx.beginPath()
      ctx.roundRect(px, py, panelW, panelH, radius)
      ctx.fill()

      // Brand red left bar
      ctx.globalAlpha = 0.95
      ctx.fillStyle = BRAND_RED
      ctx.beginPath()
      ctx.roundRect(px, py, barW, panelH, [radius, 0, 0, radius])
      ctx.fill()

      // Logo image
      if (logo) {
        ctx.globalAlpha = 0.92
        const logoX = px + barW + innerPadX
        const logoY = py + innerPadY
        ctx.drawImage(logo, logoX, logoY, logoW, logoH)
      }

      // Filename label
      ctx.globalAlpha = 0.65
      ctx.fillStyle = '#c8ccd8'
      ctx.font = `500 ${textSize}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.fillText(label, px + barW + innerPadX, py + innerPadY + logoH + gap)

      ctx.restore()
      // ── end watermark ───────────────────────────────────────────────

      const link = document.createElement('a')
      link.download = filename
      link.href = out.toDataURL('image/png')
      link.click()
    }
  }), [])

  useEffect(() => {
    if (!containerRef.current) return
    if (visibleChannels.length === 0) return

    plotRef.current?.destroy()
    plotRef.current = null
    setViewMin(fullMin)
    setViewMax(fullMax)

    const el = containerRef.current
    const w = el.clientWidth || 800
    const chartH = height - 24  // reserve 24px for the scrollbar

    const series: uPlot.Series[] = [
      { label: 'Time' },
      ...visibleChannels.map((ch) => ({
        label: ch.unit ? `${ch.name} (${ch.unit})` : ch.name,
        stroke: ch.color,
        width: 1.5,
        spanGaps: true
      }))
    ]

    const data: uPlot.AlignedData = [
      new Float64Array(logFile.timestamps),
      ...visibleChannels.map((ch) => new Float64Array(movingAvg(ch.data, smoothingRef.current)))
    ]

    // Stroke functions are called by uPlot on every redraw so they always
    // read the current CSS variables — this is what keeps grid/axis colours
    // in sync when the theme changes without rebuilding the chart.
    const axisStroke = () => getCSS('--axis')
    const gridStroke = () => getCSS('--grid')

    const opts: uPlot.Options = {
      width: w,
      height: chartH,
      class: 'interstellar-chart',
      cursor: {
        sync: { key: 'interstellar' },
        drag: { x: false, y: false }
      },
      select: { show: false, left: 0, top: 0, width: 0, height: 0 },
      legend: { show: false },
      scales: { x: { time: false }, y: { auto: true } },
      axes: [
        {
          stroke: axisStroke,
          grid: { stroke: gridStroke, width: 1 },
          ticks: { stroke: axisStroke },
          font: '11px Inter, sans-serif',
          labelFont: '11px Inter, sans-serif'
        },
        {
          stroke: axisStroke,
          grid: { stroke: gridStroke, width: 1 },
          ticks: { stroke: axisStroke },
          font: '11px Inter, sans-serif',
          labelFont: '11px Inter, sans-serif',
          size: 70
        }
      ],
      series,
      plugins: [
        // Pass the actual channel objects so tooltip uses the exact same color values
        tooltipPlugin(visibleChannels),
        wheelZoomPlugin(fullMin, fullMax, onViewChange)
      ]
    }

    plotRef.current = new uPlot(opts, data, el)

    const ro = new ResizeObserver(() => {
      if (plotRef.current && el.clientWidth > 0) {
        plotRef.current.setSize({ width: el.clientWidth, height: chartH })
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      plotRef.current?.destroy()
      plotRef.current = null
    }
  }, [logFile, visibleChannels.map((c) => c.name + c.color).join(), height])

  // Smoothing changes: update data in-place so zoom is preserved
  useEffect(() => {
    if (!plotRef.current || !logFile || visibleChannels.length === 0) return
    const newData: uPlot.AlignedData = [
      new Float64Array(logFile.timestamps),
      ...visibleChannels.map((ch) => new Float64Array(movingAvg(ch.data, smoothing)))
    ]
    plotRef.current.setData(newData, false)
  }, [smoothing])

  // Theme changes: stroke functions already read CSS on every draw;
  // force one immediate redraw so colours update without waiting for
  // the next interaction
  useEffect(() => {
    plotRef.current?.redraw(false, true)
  }, [theme])

  const panTo = useCallback((min: number, max: number) => {
    if (!plotRef.current) return
    plotRef.current.setScale('x', { min, max })
    onViewChange(min, max)
  }, [onViewChange])

  const resetZoom = useCallback(() => {
    panTo(fullMin, fullMax)
  }, [panTo, fullMin, fullMax])

  if (visibleChannels.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height, color: 'var(--text-muted)', fontSize: 13 }}>
        Select at least one channel
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div ref={containerRef} style={{ width: '100%' }} />

      <TimelineScrollbar
        fullMin={fullMin}
        fullMax={fullMax}
        viewMin={viewMin}
        viewMax={viewMax}
        onPan={panTo}
      />

      {isZoomed && (
        <button
          onClick={resetZoom}
          title="Double-click chart to reset"
          style={{
            position: 'absolute', top: 8, right: 8,
            padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.06em', background: 'rgba(229,0,10,0.15)',
            border: '1px solid rgba(229,0,10,0.4)', color: BRAND_RED,
            cursor: 'pointer', backdropFilter: 'blur(6px)', zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 5
          }}
        >
          ↺ Reset
        </button>
      )}
    </div>
  )
})

export default Chart

// ─── Timeline scrollbar ──────────────────────────────────────────────────────

function TimelineScrollbar({
  fullMin, fullMax, viewMin, viewMax, onPan
}: {
  fullMin: number; fullMax: number
  viewMin: number; viewMax: number
  onPan: (min: number, max: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const fullRange = fullMax - fullMin
  const viewRange = viewMax - viewMin
  const thumbLeft  = fullRange > 0 ? (viewMin - fullMin) / fullRange : 0
  const thumbWidth = fullRange > 0 ? viewRange / fullRange : 1
  const isFullView = thumbWidth >= 0.9999

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isFullView) return
    const startX    = e.clientX
    const startMin  = viewMin
    const startMax  = viewMax
    const onMove = (me: MouseEvent) => {
      if (!trackRef.current) return
      const delta = ((me.clientX - startX) / trackRef.current.clientWidth) * fullRange
      let newMin = startMin + delta, newMax = startMax + delta
      if (newMin < fullMin) { newMin = fullMin; newMax = fullMin + viewRange }
      if (newMax > fullMax) { newMax = fullMax; newMin = fullMax - viewRange }
      onPan(newMin, newMax)
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const jumpTo = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || isFullView) return
    if ((e.target as HTMLElement).dataset.thumb) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const center = fullMin + ratio * fullRange
    let newMin = center - viewRange / 2, newMax = center + viewRange / 2
    if (newMin < fullMin) { newMin = fullMin; newMax = fullMin + viewRange }
    if (newMax > fullMax) { newMax = fullMax; newMin = fullMax - viewRange }
    onPan(newMin, newMax)
  }

  return (
    <div
      ref={trackRef}
      onClick={jumpTo}
      style={{ position: 'relative', height: 20, marginTop: 2, cursor: isFullView ? 'default' : 'pointer', display: 'flex', alignItems: 'center', padding: '0 2px' }}
    >
      <div style={{ position: 'absolute', left: 2, right: 2, height: 3, borderRadius: 2, background: 'var(--border)' }} />
      <div
        data-thumb="1"
        onMouseDown={startDrag}
        style={{
          position: 'absolute',
          left: `calc(${thumbLeft * 100}% + 2px)`,
          width: `calc(${thumbWidth * 100}% - 4px)`,
          minWidth: 12,
          height: isFullView ? 3 : 8,
          borderRadius: 4,
          background: isFullView ? 'var(--axis)' : BRAND_RED,
          opacity: isFullView ? 0.3 : 0.9,
          cursor: isFullView ? 'default' : 'grab',
          transition: 'height 0.2s, opacity 0.2s',
          boxShadow: isFullView ? 'none' : `0 0 6px rgba(229,0,10,0.4)`
        }}
      />
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCSS(v: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || ''
}

// Tooltip receives the channel list so bullet colors match exactly
function tooltipPlugin(channels: LogChannel[]): uPlot.Plugin {
  let tooltip: HTMLDivElement | null = null

  return {
    hooks: {
      init(u) {
        tooltip = document.createElement('div')
        tooltip.style.cssText = `
          position:absolute; pointer-events:none; display:none;
          background:rgba(10,11,15,0.95); border:1px solid rgba(255,255,255,0.08);
          border-radius:8px; padding:8px 12px; font-size:12px;
          color:#e8eaf0; z-index:100; backdrop-filter:blur(10px);
          min-width:150px; box-shadow:0 8px 32px rgba(0,0,0,0.7);
        `
        u.root.appendChild(tooltip)
      },
      setCursor(u) {
        if (!tooltip) return
        const { left, top, idx } = u.cursor
        if (idx == null || left == null || left < 0) { tooltip.style.display = 'none'; return }

        const lines: string[] = []
        for (let i = 1; i < u.series.length; i++) {
          const s  = u.series[i]
          if (!s.show) continue
          const val = u.data[i][idx]
          if (val == null) continue
          // Use the channel's color directly — avoids any uPlot internal processing
          const color = channels[i - 1]?.color ?? '#fff'
          lines.push(`
            <div style="display:flex;align-items:center;gap:7px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;box-shadow:0 0 4px ${color}88"></span>
              <span style="color:#4a5068;flex:1;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:120px">${s.label}</span>
              <span style="font-weight:700;font-variant-numeric:tabular-nums;flex-shrink:0">${typeof val === 'number' ? val.toFixed(3) : val}</span>
            </div>
          `)
        }

        if (!lines.length) { tooltip.style.display = 'none'; return }

        tooltip.innerHTML = lines.join('')
        tooltip.style.display = 'block'

        const tw = tooltip.offsetWidth, th = tooltip.offsetHeight
        const uw = u.bbox.width / devicePixelRatio
        const uh = u.bbox.height / devicePixelRatio
        let tx = (left ?? 0) + 16, ty = (top ?? 0) - th / 2
        if (tx + tw > uw) tx = (left ?? 0) - tw - 16
        if (ty < 0) ty = 8
        if (ty + th > uh) ty = uh - th - 8
        tooltip.style.left = `${tx}px`
        tooltip.style.top  = `${ty + u.bbox.top / devicePixelRatio}px`
      }
    }
  }
}

// Centered moving average — O(n) sliding window, NaN-safe, no phase lag
function movingAvg(data: number[], radius: number): number[] {
  if (radius <= 0 || data.length === 0) return data

  const n   = data.length
  const out = new Array<number>(n)
  let sum = 0, cnt = 0

  // Seed the window: right half for index 0
  for (let j = 0; j <= Math.min(radius, n - 1); j++) {
    if (!isNaN(data[j])) { sum += data[j]; cnt++ }
  }

  for (let i = 0; i < n; i++) {
    // Expand right edge
    const ri = i + radius + 1
    if (ri < n && !isNaN(data[ri])) { sum += data[ri]; cnt++ }
    // Shrink left edge
    const li = i - radius
    if (li > 0 && !isNaN(data[li - 1])) { sum -= data[li - 1]; cnt-- }

    out[i] = cnt > 0 ? sum / cnt : NaN
  }

  return out
}

function wheelZoomPlugin(
  fullXMin: number,
  fullXMax: number,
  onViewChange: (min: number, max: number) => void
): uPlot.Plugin {
  const ZOOM_FACTOR = 0.75
  let selEl: HTMLDivElement | null = null
  let selStartPx: number | null = null

  function clamp(min: number, max: number): [number, number] {
    const range = max - min, fullRange = fullXMax - fullXMin
    if (range < fullRange * 0.0005) {
      const mid = (min + max) / 2
      return [mid - fullRange * 0.00025, mid + fullRange * 0.00025]
    }
    if (min < fullXMin) return [fullXMin, Math.min(fullXMin + range, fullXMax)]
    if (max > fullXMax) return [Math.max(fullXMax - range, fullXMin), fullXMax]
    return [min, max]
  }

  function notify(u: uPlot) {
    onViewChange(u.scales.x.min ?? fullXMin, u.scales.x.max ?? fullXMax)
  }

  return {
    hooks: {
      init(u) {
        const over = u.over

        // Rubber-band selection overlay
        selEl = document.createElement('div')
        selEl.style.cssText = [
          'position:absolute', 'top:0', 'bottom:0',
          'pointer-events:none', 'display:none',
          'background:rgba(229,0,10,0.10)',
          'border:1.5px solid rgba(229,0,10,0.65)',
          'border-radius:2px', 'box-sizing:border-box'
        ].join(';')
        over.appendChild(selEl)

        // Scroll wheel = zoom centered on cursor
        over.addEventListener('wheel', (e) => {
          e.preventDefault()
          const xMin = u.scales.x.min ?? fullXMin, xMax = u.scales.x.max ?? fullXMax
          const cursorLeft = u.cursor.left ?? (u.bbox.width / devicePixelRatio) / 2
          const cursorVal  = u.posToVal(cursorLeft, 'x')
          const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
          const [newMin, newMax] = clamp(
            cursorVal - (cursorVal - xMin) * factor,
            cursorVal + (xMax - cursorVal) * factor
          )
          u.setScale('x', { min: newMin, max: newMax })
          notify(u)
        }, { passive: false })

        // Left-drag = rubber-band select to zoom
        over.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return
          e.preventDefault()
          const rect = over.getBoundingClientRect()
          selStartPx = e.clientX - rect.left
          if (selEl) {
            selEl.style.left  = `${selStartPx}px`
            selEl.style.width = '0'
            selEl.style.display = 'block'
          }
          over.style.cursor = 'crosshair'
        })

        window.addEventListener('mousemove', (e) => {
          if (selStartPx === null || !selEl) return
          const rect = over.getBoundingClientRect()
          const curPx = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
          const minPx = Math.min(selStartPx, curPx)
          const maxPx = Math.max(selStartPx, curPx)
          selEl.style.left  = `${minPx}px`
          selEl.style.width = `${maxPx - minPx}px`
        })

        window.addEventListener('mouseup', (e) => {
          if (selStartPx === null || !selEl) return
          selEl.style.display = 'none'
          over.style.cursor = ''

          const rect = over.getBoundingClientRect()
          const endPx = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
          const dragPx = Math.abs(endPx - selStartPx)

          if (dragPx > 8) {
            const x1 = Math.min(selStartPx, endPx)
            const x2 = Math.max(selStartPx, endPx)
            const [newMin, newMax] = clamp(u.posToVal(x1, 'x'), u.posToVal(x2, 'x'))
            u.setScale('x', { min: newMin, max: newMax })
            notify(u)
          }

          selStartPx = null
        })

        // Double-click = reset to full view
        over.addEventListener('dblclick', () => {
          u.setScale('x', { min: fullXMin, max: fullXMax })
          notify(u)
        })
      }
    }
  }
}
