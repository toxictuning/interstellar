import { useStore } from '../store'
import logoSrc from '../assets/logo.png'
import { BRAND_RED } from '../themes'

export default function TitleBar() {
  const { logFile } = useStore()

  return (
    <div
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        WebkitAppRegion: 'drag' as never,
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      {/* Brand stripe — 2px razor line at the very top */}
      <div style={{ height: 2, background: BRAND_RED, width: '100%' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 14,
          paddingRight: 6,
          height: 38
        }}
      >
        {/* Left: logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={logoSrc}
            alt="ProTune"
            style={{
              height: 22,
              width: 'auto',
              objectFit: 'contain',
              borderRadius: 3,
              display: 'block'
            }}
            draggable={false}
          />

          {/* Separator */}
          <div
            style={{
              width: 1,
              height: 14,
              background: 'var(--border)',
              flexShrink: 0
            }}
          />

          {/* Product name */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              lineHeight: 1
            }}
          >
            ProTune Analyzer
          </span>

          {/* File name */}
          {logFile && (
            <>
              <div style={{ width: 1, height: 10, background: 'var(--border)' }} />
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  maxWidth: 320,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  opacity: 0.6
                }}
              >
                {logFile.name}
              </span>
            </>
          )}
        </div>

        {/* Right: window controls */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            WebkitAppRegion: 'no-drag' as never
          }}
        >
          <WinBtn onClick={() => window.api.minimize()} label="─" title="Minimize" />
          <WinBtn onClick={() => window.api.maximize()} label="□" title="Maximize" />
          <WinBtn onClick={() => window.api.close()} label="✕" title="Close" danger />
        </div>
      </div>
    </div>
  )
}

function WinBtn({
  onClick,
  label,
  title,
  danger
}: {
  onClick: () => void
  label: string
  title: string
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        border: 'none',
        background: 'transparent',
        color: 'var(--text-muted)',
        cursor: 'pointer',
        fontSize: danger ? 11 : 13,
        transition: 'background 0.15s, color 0.15s',
        lineHeight: 1
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger ? BRAND_RED : 'rgba(255,255,255,0.07)'
        e.currentTarget.style.color = danger ? '#fff' : 'var(--text)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--text-muted)'
      }}
    >
      {label}
    </button>
  )
}
