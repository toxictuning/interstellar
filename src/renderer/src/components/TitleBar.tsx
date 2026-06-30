import { useStore } from '../store'

export default function TitleBar() {
  const { logFile } = useStore()

  return (
    <div
      className="flex items-center justify-between px-4 h-10 shrink-0 select-none"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        WebkitAppRegion: 'drag' as never
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold tracking-widest" style={{ color: 'var(--accent)' }}>
          LogView
        </span>
        {logFile && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {logFile.name}
          </span>
        )}
      </div>

      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' as never }}
      >
        <WinBtn onClick={() => window.api.minimize()} title="Minimize">
          <MinimizeIcon />
        </WinBtn>
        <WinBtn onClick={() => window.api.maximize()} title="Maximize">
          <MaximizeIcon />
        </WinBtn>
        <WinBtn onClick={() => window.api.close()} title="Close" danger>
          <CloseIcon />
        </WinBtn>
      </div>
    </div>
  )
}

function WinBtn({
  children,
  onClick,
  title,
  danger
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-8 h-8 flex items-center justify-center rounded transition-colors"
      style={{
        color: 'var(--text-muted)',
        background: 'transparent'
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.background = danger ? '#ef4444' : 'var(--border)'
        if (danger) el.style.color = '#fff'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.background = 'transparent'
        el.style.color = 'var(--text-muted)'
      }}
    >
      {children}
    </button>
  )
}

const MinimizeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
    <rect y="4.5" width="10" height="1" />
  </svg>
)
const MaximizeIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1">
    <rect x="0.5" y="0.5" width="9" height="9" />
  </svg>
)
const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.2">
    <line x1="0" y1="0" x2="10" y2="10" />
    <line x1="10" y1="0" x2="0" y2="10" />
  </svg>
)
