import Papa from 'papaparse'
import type { LogFile, LogChannel } from './types'
import { DEFAULT_CHANNEL_COLORS } from './themes'
import { isVCDS, parseVCDS } from './vcdsParser'

const TIME_KEYS = ['time', 'timestamp', 'time (s)', 'time(s)', 'ms', 'elapsed']

function detectTimeColumn(headers: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim())
  for (const key of TIME_KEYS) {
    const idx = lower.indexOf(key)
    if (idx !== -1) return idx
  }
  return 0
}

function parseUnit(header: string): { name: string; unit: string } {
  const match = header.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (match) return { name: match[1].trim(), unit: match[2].trim() }
  return { name: header.trim(), unit: '' }
}

export function parseCSV(content: string, filePath: string): LogFile | null {
  // VCDS files have a non-standard multi-timestamp structure — delegate to the dedicated parser
  if (isVCDS(content)) {
    return parseVCDS(content, filePath)
  }

  const result = Papa.parse<string[]>(content, {
    skipEmptyLines: true,
    dynamicTyping: false
  })

  if (result.errors.length && !result.data.length) return null

  const rows = result.data as string[][]
  if (rows.length < 2) return null

  const headers = rows[0].map((h) => String(h))
  const dataRows = rows.slice(1)

  const timeIdx = detectTimeColumn(headers)

  const timestamps: number[] = []
  const channelArrays: number[][] = headers.map(() => [])

  for (const row of dataRows) {
    const t = parseFloat(row[timeIdx])
    if (isNaN(t)) continue
    timestamps.push(t)
    for (let i = 0; i < headers.length; i++) {
      channelArrays[i].push(parseFloat(row[i]) || 0)
    }
  }

  const channels: LogChannel[] = headers
    .map((h, i) => {
      if (i === timeIdx) return null
      const { name, unit } = parseUnit(h)
      const data = channelArrays[i]
      const validData = data.filter((v) => !isNaN(v))
      return {
        name,
        unit,
        color: DEFAULT_CHANNEL_COLORS[i % DEFAULT_CHANNEL_COLORS.length],
        visible: false,
        data,
        min: validData.length ? Math.min(...validData) : 0,
        max: validData.length ? Math.max(...validData) : 1
      } as LogChannel
    })
    .filter(Boolean) as LogChannel[]

  // Auto-select first 2 channels
  if (channels.length > 0) channels[0].visible = true
  if (channels.length > 1) channels[1].visible = true

  const fileName = filePath.split(/[\\/]/).pop() || filePath

  return {
    path: filePath,
    name: fileName,
    timestamps,
    channels,
    rowCount: timestamps.length
  }
}
