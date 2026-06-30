import { useEffect, useRef, useState, useCallback } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import type { LogFile } from '../types'
import { BRAND_RED } from '../themes'

interface ChartProps {
  logFile: LogFile
  height?: number
}

export default function Chart({ logFile, height = 400 }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<uPlot | null>(null)

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
      ...visibleChannels.map((ch) => new Float64Array(ch.data))
    ]

    const opts: uPlot.Options = {
      width: w,
      height: chartH,
      class: 'logview-chart',
      cursor: {
        sync: { key: 'logview' },
        drag: { x: false, y: false }
      },
      select: { show: false, left: 0, top: 0, width: 0, height: 0 },
      legend: { show: false },
      scales: { x: { time: false }, y: { auto: true } },
      axes: [
        {
          stroke: getCSS('--axis'),
          grid: { stroke: getCSS('--grid'), width: 1 },
          ticks: { stroke: getCSS('--axis') },
          font: '11px Inter, sans-serif',
          labelFont: '11px Inter, sans-serif'
        },
        {
          stroke: getCSS('--axis'),
          grid: { stroke: getCSS('--grid'), width: 1 },
          ticks: { stroke: getCSS('--axis') },
          font: '11px Inter, sans-serif',
          labelFont: '11px Inter, sans-serif',
          size: 70
        }
      ],
      series,
      plugins: [
        tooltipPlugin(),
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
        Select at least one channel below
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* uPlot renders here */}
      <div ref={containerRef} style={{ width: '100%' }} />

      {/* Timeline scrollbar */}
      <TimelineScrollbar
        fullMin={fullMin}
        fullMax={fullMax}
        viewMin={viewMin}
        viewMax={viewMax}
        onPan={panTo}
      />

      {/* Reset zoom badge */}
      {isZoomed && (
        <button
          onClick={resetZoom}
          title="Double-click chart to reset"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '3px 10px',
            borderRadius: 5,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.06em',
            background: 'rgba(229,0,10,0.15)',
            border: '1px solid rgba(229,0,10,0.4)',
            color: BRAND_RED,
            cursor: 'pointer',
            backdropFilter: 'blur(6px)',
            zIndex: 10
          }}
        >
          Reset Zoom
        </button>
      )}
    </div>
  )
}

// ─── Timeline scrollbar ──────────────────────────────────────────────────────

interface ScrollbarProps {
  fullMin: number
  fullMax: number
  viewMin: number
  viewMax: number
  onPan: (min: number, max: number) => void
}

function TimelineScrollbar({ fullMin, fullMax, viewMin, viewMax, onPan }: ScrollbarProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const fullRange = fullMax - fullMin
  const viewRange = viewMax - viewMin
  const thumbLeft = fullRange > 0 ? (viewMin - fullMin) / fullRange : 0
  const thumbWidth = fullRange > 0 ? viewRange / fullRange : 1
  const isFullView = thumbWidth >= 0.9999

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isFullView) return

    const startX = e.clientX
    const startMin = viewMin
    const startMax = viewMax

    const onMove = (me: MouseEvent) => {
      if (!trackRef.current) return
      const trackW = trackRef.current.clientWidth
      const delta = ((me.clientX - startX) / trackW) * fullRange
      let newMin = startMin + delta
      let newMax = startMax + delta
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
    // Ignore clicks that originated on the thumb itself
    if ((e.target as HTMLElement).dataset.thumb) return
    const rect = trackRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const center = fullMin + ratio * fullRange
    const half = viewRange / 2
    let newMin = center - half
    let newMax = center + half
    if (newMin < fullMin) { newMin = fullMin; newMax = fullMin + viewRange }
    if (newMax > fullMax) { newMax = fullMax; newMin = fullMax - viewRange }
    onPan(newMin, newMax)
  }

  return (
    <div
      ref={trackRef}
      onClick={jumpTo}
      style={{
        position: 'relative',
        height: 20,
        marginTop: 2,
        cursor: isFullView ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: '0 2px'
      }}
    >
      {/* Rail */}
      <div
        style={{
          position: 'absolute',
          left: 2,
          right: 2,
          height: 3,
          borderRadius: 2,
          background: 'var(--border)'
        }}
      />

      {/* Thumb */}
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
          opacity: isFullView ? 0.35 : 0.9,
          cursor: isFullView ? 'default' : 'grab',
          transition: 'height 0.2s, opacity 0.2s, background 0.2s',
          boxShadow: isFullView ? 'none' : `0 0 6px rgba(229,0,10,0.4)`
        }}
      />
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCSS(v: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#333'
}

function wheelZoomPlugin(
  fullXMin: number,
  fullXMax: number,
  onViewChange: (min: number, max: number) => void
): uPlot.Plugin {
  const ZOOM_FACTOR = 0.75
  let isPanning = false
  let panStartClientX = 0
  let panStartMin = 0
  let panStartMax = 0

  function clamp(min: number, max: number): [number, number] {
    const range = max - min
    const fullRange = fullXMax - fullXMin
    if (range < fullRange * 0.0005) return [min, min + fullRange * 0.0005]
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

        over.addEventListener('wheel', (e) => {
          e.preventDefault()
          const xMin = u.scales.x.min ?? fullXMin
          const xMax = u.scales.x.max ?? fullXMax
          const cursorLeft = u.cursor.left ?? (u.bbox.width / devicePixelRatio) / 2
          const cursorVal = u.posToVal(cursorLeft, 'x')
          const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
          let [newMin, newMax] = clamp(
            cursorVal - (cursorVal - xMin) * factor,
            cursorVal + (xMax - cursorVal) * factor
          )
          u.setScale('x', { min: newMin, max: newMax })
          notify(u)
        }, { passive: false })

        over.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return
          isPanning = true
          panStartClientX = e.clientX
          panStartMin = u.scales.x.min ?? fullXMin
          panStartMax = u.scales.x.max ?? fullXMax
          over.style.cursor = 'grabbing'
        })

        window.addEventListener('mousemove', (e) => {
          if (!isPanning) return
          const range = panStartMax - panStartMin
          const pxWidth = u.bbox.width / devicePixelRatio
          if (pxWidth === 0) return
          const valPerPx = range / pxWidth
          const delta = -(e.clientX - panStartClientX) * valPerPx
          let [newMin, newMax] = clamp(panStartMin + delta, panStartMax + delta)
          const clampedRange = newMax - newMin
          if (Math.abs(clampedRange - range) > 1e-9) {
            if (newMin <= fullXMin) newMax = fullXMin + range
            else newMin = fullXMax - range
          }
          u.setScale('x', { min: newMin, max: newMax })
          notify(u)
        })

        const stopPan = () => {
          if (isPanning) { isPanning = false; over.style.cursor = '' }
        }
        window.addEventListener('mouseup', stopPan)
        window.addEventListener('mouseleave', stopPan)

        over.addEventListener('dblclick', () => {
          u.setScale('x', { min: fullXMin, max: fullXMax })
          notify(u)
        })
      }
    }
  }
}

function tooltipPlugin(): uPlot.Plugin {
  let tooltip: HTMLDivElement | null = null

  return {
    hooks: {
      init(u) {
        tooltip = document.createElement('div')
        tooltip.style.cssText = `
          position:absolute; pointer-events:none; display:none;
          background:rgba(10,11,15,0.94); border:1px solid rgba(255,255,255,0.08);
          border-radius:8px; padding:8px 12px; font-size:12px;
          color:#e8eaf0; z-index:100; backdrop-filter:blur(10px);
          min-width:140px; box-shadow:0 8px 32px rgba(0,0,0,0.6);
        `
        u.root.appendChild(tooltip)
      },
      setCursor(u) {
        if (!tooltip) return
        const { left, top, idx } = u.cursor
        if (idx == null || left == null || left < 0) { tooltip.style.display = 'none'; return }

        const lines: string[] = []
        for (let i = 1; i < u.series.length; i++) {
          const s = u.series[i]
          if (!s.show) continue
          const val = u.data[i][idx]
          if (val == null) continue
          const color = typeof s.stroke === 'string' ? s.stroke : '#fff'
          lines.push(`
            <div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:7px;height:7px;border-radius:50%;background:${color};flex-shrink:0"></span>
              <span style="color:#4a5068;flex:1;font-size:11px">${s.label}</span>
              <span style="font-weight:700;font-variant-numeric:tabular-nums">${typeof val === 'number' ? val.toFixed(3) : val}</span>
            </div>
          `)
        }

        if (!lines.length) { tooltip.style.display = 'none'; return }

        tooltip.innerHTML = lines.join('')
        tooltip.style.display = 'block'

        const tw = tooltip.offsetWidth
        const th = tooltip.offsetHeight
        const uw = u.bbox.width / devicePixelRatio
        const uh = u.bbox.height / devicePixelRatio
        let tx = (left ?? 0) + 16
        let ty = (top ?? 0) - th / 2
        if (tx + tw > uw) tx = (left ?? 0) - tw - 16
        if (ty < 0) ty = 8
        if (ty + th > uh) ty = uh - th - 8
        tooltip.style.left = `${tx}px`
        tooltip.style.top = `${ty + u.bbox.top / devicePixelRatio}px`
      }
    }
  }
}
