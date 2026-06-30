import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'

const api = {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // File operations
  openFileDialog: (mode?: 'csv' | 'exe'): Promise<string | null> => ipcRenderer.invoke('open-file-dialog', mode),
  readFile: (path: string): Promise<{ ok: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke('read-file', path),
  openExternal: (path: string, app?: string): Promise<void> =>
    ipcRenderer.invoke('open-external', path, app),

  // App info
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-version'),

  // Updates
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Event listeners
  onOpenFile: (cb: (path: string) => void) => {
    const handler = (_: IpcRendererEvent, path: string) => cb(path)
    ipcRenderer.on('open-file', handler)
    return () => ipcRenderer.removeListener('open-file', handler)
  },
  onUpdateAvailable: (cb: (info: unknown) => void) => {
    const handler = (_: IpcRendererEvent, info: unknown) => cb(info)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },
  onUpdateProgress: (cb: (progress: unknown) => void) => {
    const handler = (_: IpcRendererEvent, p: unknown) => cb(p)
    ipcRenderer.on('update-progress', handler)
    return () => ipcRenderer.removeListener('update-progress', handler)
  },
  onUpdateDownloaded: (cb: (info: unknown) => void) => {
    const handler = (_: IpcRendererEvent, info: unknown) => cb(info)
    ipcRenderer.on('update-downloaded', handler)
    return () => ipcRenderer.removeListener('update-downloaded', handler)
  },
  onUpdateError: (cb: (msg: string) => void) => {
    const handler = (_: IpcRendererEvent, msg: string) => cb(msg)
    ipcRenderer.on('update-error', handler)
    return () => ipcRenderer.removeListener('update-error', handler)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
