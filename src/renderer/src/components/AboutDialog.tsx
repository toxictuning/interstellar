import { useEffect, useState } from 'react'
import logoSrc from '../assets/logo.png'
import { BRAND_RED } from '../themes'

export default function AboutDialog({ onClose }: { onClose: () => void }) {
  const [version, setVersion] = useState('—')

  useEffect(() => {
    window.api.getVersion().then(setVersion).catch(() => {})
  }, [])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)'
        }}
      />

      {/* Card */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201, width: 320,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        boxShadow: '0 32px 80px rgba(0,0,0,0.85)',
        overflow: 'hidden'
      }}>
        {/* Brand stripe */}
        <div style={{ height: 2, background: BRAND_RED }} />

        <div style={{ padding: '28px 28px 22px', textAlign: 'center' }}>
          {/* Logo */}
          <img
            src={logoSrc}
            alt="Toxic Tuning"
            draggable={false}
            style={{ height: 38, borderRadius: 4, marginBottom: 18, display: 'block', margin: '0 auto 18px' }}
          />

          {/* App name */}
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text)' }}>
            Interstellar
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, marginBottom: 22, opacity: 0.6 }}>
            Version {version}
          </div>

          {/* Credits */}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
            Designed &amp; built by
          </div>
          <div style={{ fontSize: 17, fontWeight: 800, color: BRAND_RED, marginBottom: 4, letterSpacing: '-0.01em' }}>
            Wayne M.
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 22 }}>
            Toxic Tuning &nbsp;·&nbsp; South Africa 🇿🇦
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--border)', marginBottom: 16 }} />

          {/* Legal */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', opacity: 0.6, marginBottom: 3 }}>
            © {new Date().getFullYear()} Toxic Tuning. All rights reserved.
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.4, marginBottom: 16, lineHeight: 1.5 }}>
            Unauthorised copying or distribution of this software,<br />
            in whole or in part, is strictly prohibited.
          </div>

          {/* Stack credits */}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.35, marginBottom: 22, letterSpacing: '0.04em' }}>
            Built with Electron · React · uPlot · TypeScript
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              padding: '8px 32px', borderRadius: 7,
              background: BRAND_RED, color: '#fff',
              border: 'none', fontSize: 11, fontWeight: 800,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'opacity 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
