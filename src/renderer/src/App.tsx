import { useEffect } from 'react'
import { useStore } from './store'
import { THEMES } from './themes'
import type { FontSize } from './types'

const FONT_VARS: Record<FontSize, Record<string, string>> = {
  small:  { '--ui-fs': '10px', '--ui-fs-sm': '9px',  '--ui-fs-xs': '8px',  '--chart-axis-fs': '9px'  },
  normal: { '--ui-fs': '11px', '--ui-fs-sm': '10px', '--ui-fs-xs': '9px',  '--chart-axis-fs': '11px' },
  large:  { '--ui-fs': '13px', '--ui-fs-sm': '12px', '--ui-fs-xs': '11px', '--chart-axis-fs': '13px' },
}
import { parseCSV } from './csvParser'
import WelcomeScreen from './components/WelcomeScreen'
import LogViewer from './components/LogViewer'
import TitleBar from './components/TitleBar'
import UpdateBanner from './components/UpdateBanner'

async function openFilePath(path: string, setLogFile: (f: ReturnType<typeof parseCSV>) => void) {
  const res = await window.api.readFile(path)
  if (res.ok && res.content) {
    const parsed = parseCSV(res.content, path)
    if (parsed) setLogFile(parsed)
  }
}

export default function App() {
  const { logFile, settings, setLogFile, setUpdateAvailable, setUpdateDownloaded, setUpdateProgress } = useStore()
  const theme = THEMES[settings.theme]

  useEffect(() => {
    const style = document.documentElement.style
    style.setProperty('--bg', theme.bg)
    style.setProperty('--surface', theme.surface)
    style.setProperty('--border', theme.border)
    style.setProperty('--text', theme.text)
    style.setProperty('--text-muted', theme.textMuted)
    style.setProperty('--accent', theme.accent)
    style.setProperty('--chart-bg', theme.chartBg)
    style.setProperty('--grid', theme.gridColor)
    style.setProperty('--axis', theme.axisColor)
    document.body.style.background = theme.bg
  }, [theme])

  useEffect(() => {
    const style = document.documentElement.style
    const vars = FONT_VARS[settings.fontSize ?? 'normal']
    Object.entries(vars).forEach(([k, v]) => style.setProperty(k, v))
  }, [settings.fontSize])

  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (!file) return
      const path = (file as File & { path: string }).path
      if (path) openFilePath(path, setLogFile)
    }
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)

    const off1 = window.api.onOpenFile((path) => openFilePath(path, setLogFile))
    const off2 = window.api.onUpdateAvailable((info) =>
      setUpdateAvailable(info as { version: string })
    )
    const off3 = window.api.onUpdateProgress((p) => {
      const progress = (p as { percent: number }).percent
      setUpdateProgress(Math.round(progress))
    })
    const off4 = window.api.onUpdateDownloaded(() => {
      setUpdateDownloaded(true)
      setUpdateProgress(null)
    })
    return () => {
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
      off1(); off2(); off3(); off4()
    }
  }, [])

  return (
    <div
      className="flex flex-col h-screen"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <TitleBar />
      <UpdateBanner />
      <div className="flex-1 overflow-hidden">
        {logFile ? <LogViewer /> : <WelcomeScreen />}
      </div>
    </div>
  )
}
