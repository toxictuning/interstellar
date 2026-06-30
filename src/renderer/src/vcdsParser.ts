import type { LogFile, LogChannel } from './types'
import { DEFAULT_CHANNEL_COLORS } from './themes'

// ─── Detection ────────────────────────────────────────────────────────────────

export function isVCDS(content: string): boolean {
  const head = content.slice(0, 512)
  return (
    head.includes('VCDS Version:') ||
    head.includes('VCID:') ||
    // Some older exports use VAG-COM
    head.includes('VAG-COM')
  )
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export function parseVCDS(content: string, filePath: string): LogFile | null {
  const rawLines = content.split('\n')

  // ── Extract metadata from header ──────────────────────────────────────────
  let ecuInfo = ''
  if (rawLines[1]) {
    const parts = rawLines[1].split(',').map((s) => s.trim()).filter(Boolean)
    // "8S0 907 404 F", "ADVMB", "R5 2.5l TFSI  H22 0006"
    ecuInfo = parts.filter((p) => p && p !== 'ADVMB').join(' · ')
  }

  // ── Find the label row (the one that starts with ",STAMP,") ───────────────
  // Structure:
  //   ...metadata rows...
  //   Marker,TIME,Loc. IDE00021,...        ← channel-ID row  (optional)
  //   ,STAMP,Engine RPM,...               ← LABEL row        (required)
  //   ,, /min,, hPa,...                   ← UNIT row
  //   ,0.11,753,...                       ← DATA rows
  let labelRowIdx = -1

  for (let i = 0; i < Math.min(rawLines.length, 20); i++) {
    const trimmed = rawLines[i].trimStart()
    if (trimmed.startsWith(',STAMP,') || trimmed.match(/^,\s*STAMP,/i)) {
      labelRowIdx = i
      break
    }
  }

  // Fallback: find "Marker,TIME," row and step down one
  if (labelRowIdx === -1) {
    for (let i = 0; i < Math.min(rawLines.length, 20); i++) {
      if (rawLines[i].startsWith('Marker,TIME,') || rawLines[i].startsWith('Marker, TIME,')) {
        labelRowIdx = i + 1
        break
      }
    }
  }

  if (labelRowIdx === -1) return null

  const unitRowIdx  = labelRowIdx + 1
  const dataStart   = labelRowIdx + 2

  const labelCols = splitRow(rawLines[labelRowIdx])
  const unitCols  = splitRow(rawLines[unitRowIdx] ?? '')

  // ── Identify (stamp, value) column pairs ──────────────────────────────────
  // Col 0 = Marker. Then: STAMP, value, STAMP, value, ...
  interface ColPair { name: string; unit: string; si: number; vi: number }
  const pairs: ColPair[] = []

  for (let i = 1; i < labelCols.length - 1; i++) {
    if (labelCols[i].trim().toUpperCase() === 'STAMP') {
      const name = labelCols[i + 1]?.trim()
      if (name && name.toUpperCase() !== 'STAMP' && name !== '') {
        // Clean unit: strip leading slash that VCDS sometimes adds
        const rawUnit = unitCols[i + 1]?.trim() ?? ''
        const unit = rawUnit.replace(/^\/\s*/, '').trim()
        pairs.push({ name, unit, si: i, vi: i + 1 })
        i++ // skip the value column in this loop
      }
    }
  }

  if (pairs.length === 0) return null

  // ── Parse data rows ───────────────────────────────────────────────────────
  const stamps: number[][] = pairs.map(() => [])
  const values: number[][] = pairs.map(() => [])

  for (let r = dataStart; r < rawLines.length; r++) {
    const line = rawLines[r]?.trim()
    if (!line || line === '') continue

    const cols = splitRow(line)

    for (let c = 0; c < pairs.length; c++) {
      const p  = pairs[c]
      const t  = parseFloat(cols[p.si])
      const v  = parseFloat(cols[p.vi])
      if (!isNaN(t)) {
        stamps[c].push(t)
        values[c].push(isNaN(v) ? 0 : v)
      }
    }
  }

  if (stamps[0].length === 0) return null

  // ── Unified time axis: use channel-0's timestamps ─────────────────────────
  // All other channels are linearly interpolated onto this axis.
  // VCDS samples channels within the same scan cycle (timestamps differ by
  // <200 ms), so linear interpolation gives a clean result.
  const masterT = stamps[0]

  const channels: LogChannel[] = pairs.map((p, i) => {
    const data =
      i === 0
        ? [...values[0]]
        : linterp(stamps[i], values[i], masterT)

    const finite = data.filter((v) => isFinite(v))
    return {
      name:    p.name,
      unit:    p.unit,
      color:   DEFAULT_CHANNEL_COLORS[i % DEFAULT_CHANNEL_COLORS.length],
      visible: i < 2,
      data,
      min: finite.length ? Math.min(...finite) : 0,
      max: finite.length ? Math.max(...finite) : 1
    }
  })

  const fileName = filePath.split(/[\\/]/).pop() ?? filePath
  // Append ECU info to the display name so tuners know which car/ECU
  const displayName = ecuInfo ? `${fileName}  [${ecuInfo}]` : fileName

  return {
    path:     filePath,
    name:     displayName,
    timestamps: masterT,
    channels,
    rowCount: masterT.length
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitRow(line: string): string[] {
  // VCDS does not use quoted fields containing commas, so a plain split is safe
  return line.split(',')
}

/**
 * Linear interpolation of (srcT, srcV) sampled at each point in targetT.
 * Clamps to the first/last source value outside the source range.
 */
function linterp(srcT: number[], srcV: number[], targetT: number[]): number[] {
  if (srcT.length === 0) return targetT.map(() => NaN)
  if (srcT.length === 1) return targetT.map(() => srcV[0])

  return targetT.map((t) => {
    if (t <= srcT[0])                    return srcV[0]
    if (t >= srcT[srcT.length - 1])     return srcV[srcT.length - 1]

    // Binary search for the surrounding interval
    let lo = 0, hi = srcT.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (srcT[mid] <= t) lo = mid
      else hi = mid
    }

    const dt = srcT[hi] - srcT[lo]
    if (dt === 0) return srcV[lo]
    return srcV[lo] + (srcV[hi] - srcV[lo]) * (t - srcT[lo]) / dt
  })
}
