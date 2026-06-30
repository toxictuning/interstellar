import { useEffect, useRef } from 'react'
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

  const visibleChannels = logFile.channels.filter((c) => c.visible)

  useEffect(() => {
    if (!containerRef.current) return
    if (visibleChannels.length === 0) return

    // Destroy previous instance
    plotRef.current?.destroy()
    plotRef.current = null

    const el = containerRef.current
    const w = el.clientWidth || 800

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
        sync: { key: 'logview' }
      },
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
      plugins: [tooltipPlugin()]
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

  return <div ref={containerRef} style={{ width: '100%' }} />
}

function getCSS(v: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#333'
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
