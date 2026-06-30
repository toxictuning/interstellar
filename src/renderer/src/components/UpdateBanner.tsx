import { useStore } from '../store'
import { BRAND_RED } from '../themes'

export default function UpdateBanner() {
  const { updateAvailable, updateDownloaded, updateProgress, setUpdateAvailable } = useStore()

  if (updateDownloaded) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 16px', flexShrink: 0,
          background: 'rgba(22,163,74,0.12)', borderBottom: '1px solid rgba(22,163,74,0.25)',
          color: '#4ade80', fontSize: 12
        }}
      >
        <span>Update downloaded — restart to apply</span>
        <button
          onClick={() => window.api.installUpdate()}
          style={{
            padding: '4px 12px', borderRadius: 4, border: 'none',
            background: '#16a34a', color: '#fff', fontSize: 11,
            fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer'
          }}
        >
          Restart &amp; Install
        </button>
      </div>
    )
  }

  if (updateProgress !== null) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '7px 16px', flexShrink: 0,
          background: 'var(--surface)', borderBottom: '1px solid var(--border)',
          color: 'var(--text-muted)', fontSize: 12
        }}
      >
        <span style={{ whiteSpace: 'nowrap' }}>Downloading update… {updateProgress}%</span>
        <div style={{ flex: 1, height: 2, borderRadius: 1, background: 'var(--border)', overflow: 'hidden' }}>
          <div style={{ width: `${updateProgress}%`, height: '100%', background: BRAND_RED, transition: 'width 0.3s' }} />
        </div>
      </div>
    )
  }

  if (updateAvailable) {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '7px 16px', flexShrink: 0,
          background: 'rgba(229,0,10,0.08)', borderBottom: '1px solid rgba(229,0,10,0.2)',
          color: 'rgba(229,0,10,0.9)', fontSize: 12
        }}
      >
        <span>Update v{updateAvailable.version} available</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.api.downloadUpdate()}
            style={{
              padding: '4px 12px', borderRadius: 4, border: 'none',
              background: BRAND_RED, color: '#fff', fontSize: 11,
              fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer'
            }}
          >
            Download
          </button>
          <button
            onClick={() => setUpdateAvailable(null)}
            style={{
              padding: '4px 8px', borderRadius: 4, border: 'none',
              background: 'transparent', color: 'var(--text-muted)',
              fontSize: 11, cursor: 'pointer'
            }}
          >
            Later
          </button>
        </div>
      </div>
    )
  }

  return null
}
