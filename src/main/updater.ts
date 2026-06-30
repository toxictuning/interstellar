import { BrowserWindow, ipcMain } from 'electron'
import { autoUpdater } from 'electron-updater'
import { is } from '@electron-toolkit/utils'

export function setupUpdater(win: BrowserWindow): void {
  if (is.dev) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', () => {
    win.webContents.send('update-not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    win.webContents.send('update-progress', progress)
  })

  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('update-downloaded', info)
  })

  autoUpdater.on('error', (err) => {
    win.webContents.send('update-error', err.message)
  })

  ipcMain.handle('check-for-updates', () => autoUpdater.checkForUpdates())
  ipcMain.handle('download-update', () => autoUpdater.downloadUpdate())
  ipcMain.handle('install-update', () => autoUpdater.quitAndInstall())

  // Check on startup after a short delay
  setTimeout(() => autoUpdater.checkForUpdates(), 5000)
}
