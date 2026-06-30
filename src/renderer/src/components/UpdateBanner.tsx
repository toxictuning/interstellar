import { useStore } from '../store'

export default function UpdateBanner() {
  const { updateAvailable, updateDownloaded, updateProgress, setUpdateAvailable } = useStore()

  if (updateDownloaded) {
    return (
      <div
        className="flex items-center justify-between px-4 py-2 text-xs shrink-0"
        style={{ background: '#16a34a22', borderBottom: '1px solid #16a34a44', color: '#4ade80' }}
      >
        <span>Update downloaded — restart to apply</span>
        <button
          onClick={() => window.api.installUpdate()}
          className="px-3 py-1 rounded-lg font-bold"
          style={{ background: '#16a34a', color: '#fff' }}
        >
          Restart & Install
        </button>
      </div>
    )
  }

  if (updateProgress !== null) {
    return (
      <div
        className="flex items-center gap-3 px-4 py-2 text-xs shrink-0"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', color: 'var(--text)' }}
      >
        <span>Downloading update... {updateProgress}%</span>
        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${updateProgress}%`, background: 'var(--accent)' }}
          />
        </div>
      </div>
    )
  }

  if (updateAvailable) {
    return (
      <div
        className="flex items-center justify-between px-4 py-2 text-xs shrink-0"
        style={{ background: '#7c6ef722', borderBottom: '1px solid #7c6ef744', color: '#a78bfa' }}
      >
        <span>Update v{updateAvailable.version} available</span>
        <div className="flex gap-2">
          <button
            onClick={() => window.api.downloadUpdate()}
            className="px-3 py-1 rounded-lg font-bold"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Download
          </button>
          <button
            onClick={() => setUpdateAvailable(null)}
            className="px-2 py-1 rounded-lg"
            style={{ color: 'var(--text-muted)' }}
          >
            Later
          </button>
        </div>
      </div>
    )
  }

  return null
}
