import { useEffect, useRef, useState } from 'react'
import uPlot from 'uplot'
import 'uplot/dist/uPlot.min.css'
import type { LogFile } from '../types'

interface ChartProps {
  logFile: LogFile
  height?: number
}

export default function Chart({ logFile, height = 400 }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const plotRef = useRef<uPlot | null>(null)
  const [isZoomed, setIsZoomed] = useState(false)

  const visibleChannels = logFile.channels.filter((c) => c.visible)

  useEffect(() => {
    if (!containerRef.current) return
    if (visibleChannels.length === 0) return

    plotRef.current?.destroy()
    plotRef.current = null
    setIsZoomed(false)

    const el = containerRef.current
    const w = el.clientWidth || 800

    const fullXMin = logFile.timestamps[0]
    const fullXMax = logFile.timestamps[logFile.timestamps.length - 1]

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
      height,
      class: 'logview-chart',
      cursor: {
        sync: { key: 'logview' },
        drag: { x: false, y: false }
      },
      select: { show: false, left: 0, top: 0, width: 0, height: 0 },
      legend: { show: false },
      scales: {
        x: { time: false },
        y: { auto: true }
      },
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
        wheelZoomPlugin(fullXMin, fullXMax, setIsZoomed)
      ]
    }

    plotRef.current = new uPlot(opts, data, el)

    const ro = new ResizeObserver(() => {
      if (plotRef.current && el.clientWidth > 0) {
        plotRef.current.setSize({ width: el.clientWidth, height })
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      plotRef.current?.destroy()
      plotRef.current = null
    }
  }, [logFile, visibleChannels.map((c) => c.name + c.color).join(), height])

  const resetZoom = () => {
    if (!plotRef.current) return
    const ts = logFile.timestamps
    plotRef.current.setScale('x', { min: ts[0], max: ts[ts.length - 1] })
    setIsZoomed(false)
  }

  if (visibleChannels.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-full text-sm"
        style={{ color: 'var(--text-muted)' }}
      >
        Select at least one channel below
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div ref={containerRef} style={{ width: '100%' }} />
      {isZoomed && (
        <button
          onClick={resetZoom}
          title="Reset zoom (double-click chart)"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '3px 10px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 600,
            background: 'rgba(124,110,247,0.18)',
            border: '1px solid rgba(124,110,247,0.5)',
            color: '#a78bfa',
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
            zIndex: 10
          }}
        >
          Reset Zoom
        </button>
      )}
    </div>
  )
}

function getCSS(v: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#333'
}

function wheelZoomPlugin(
  fullXMin: number,
  fullXMax: number,
  onZoomChange: (zoomed: boolean) => void
): uPlot.Plugin {
  const ZOOM_FACTOR = 0.75  // scroll up zooms to 75% of current range
  let isPanning = false
  let panStartClientX = 0
  let panStartMin = 0
  let panStartMax = 0

  function clampScale(min: number, max: number): [number, number] {
    const range = max - min
    const fullRange = fullXMax - fullXMin
    // Prevent zooming beyond the data or past a very small range
    if (range < fullRange * 0.0005) return [min, min + fullRange * 0.0005]
    if (min < fullXMin) return [fullXMin, Math.min(fullXMin + range, fullXMax)]
    if (max > fullXMax) return [Math.max(fullXMax - range, fullXMin), fullXMax]
    return [min, max]
  }

  function isFullRange(u: uPlot): boolean {
    const xMin = u.scales.x.min ?? fullXMin
    const xMax = u.scales.x.max ?? fullXMax
    return Math.abs(xMin - fullXMin) < 1e-9 && Math.abs(xMax - fullXMax) < 1e-9
  }

  return {
    hooks: {
      init(u) {
        const over = u.over

        // ── Scroll wheel: zoom X axis centred on cursor ──
        over.addEventListener(
          'wheel',
          (e) => {
            e.preventDefault()

            const xMin = u.scales.x.min ?? fullXMin
            const xMax = u.scales.x.max ?? fullXMax

            // Cursor position in data coordinates
            const cursorLeft = u.cursor.left ?? (u.bbox.width / devicePixelRatio) / 2
            const cursorVal = u.posToVal(cursorLeft, 'x')

            const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR
            let newMin = cursorVal - (cursorVal - xMin) * factor
            let newMax = cursorVal + (xMax - cursorVal) * factor
            ;[newMin, newMax] = clampScale(newMin, newMax)

            u.setScale('x', { min: newMin, max: newMax })
            onZoomChange(!isFullRange(u))
          },
          { passive: false }
        )

        // ── Left-click drag: pan ──
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
          let [newMin, newMax] = clampScale(panStartMin + delta, panStartMax + delta)
          // Keep range constant while panning
          const clampedRange = newMax - newMin
          if (Math.abs(clampedRange - range) > 1e-9) {
            if (newMin === fullXMin) newMax = fullXMin + range
            else newMin = fullXMax - range
          }
          u.setScale('x', { min: newMin, max: newMax })
          onZoomChange(!isFullRange(u))
        })

        const stopPan = () => {
          if (isPanning) {
            isPanning = false
            over.style.cursor = ''
          }
        }
        window.addEventListener('mouseup', stopPan)
        window.addEventListener('mouseleave', stopPan)

        // ── Double-click: reset to full range ──
        over.addEventListener('dblclick', () => {
          u.setScale('x', { min: fullXMin, max: fullXMax })
          onZoomChange(false)
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
          background:rgba(15,17,23,0.92); border:1px solid rgba(255,255,255,0.1);
          border-radius:8px; padding:8px 12px; font-size:12px;
          color:#e2e8f0; z-index:100; backdrop-filter:blur(8px);
          min-width:140px; box-shadow:0 8px 24px rgba(0,0,0,0.5);
        `
        u.root.appendChild(tooltip)
      },
      setCursor(u) {
        if (!tooltip) return
        const { left, top, idx } = u.cursor
        if (idx == null || left == null || left < 0) {
          tooltip.style.display = 'none'
          return
        }

        const lines: string[] = []
        for (let i = 1; i < u.series.length; i++) {
          const s = u.series[i]
          if (!s.show) continue
          const val = u.data[i][idx]
          if (val == null) continue
          const color = typeof s.stroke === 'string' ? s.stroke : '#fff'
          lines.push(
            `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
              <span style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></span>
              <span style="color:#94a3b8;flex:1">${s.label}</span>
              <span style="font-weight:600">${typeof val === 'number' ? val.toFixed(3) : val}</span>
            </div>`
          )
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
