import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupUpdater } from './updater'

let mainWindow: BrowserWindow | null = null
let pendingFilePath: string | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f1117',
    icon: join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow!.show()
    if (pendingFilePath) {
      mainWindow!.webContents.send('open-file', pendingFilePath)
      pendingFilePath = null
    }
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Handle file open from OS (e.g. double-click .csv)
app.on('will-finish-launching', () => {
  app.on('open-file', (event, path) => {
    event.preventDefault()
    if (mainWindow) {
      mainWindow.webContents.send('open-file', path)
    } else {
      pendingFilePath = path
    }
  })
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.toxictuning.logview')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Check if launched with a file argument (Windows file association)
  const args = process.argv.slice(is.dev ? 2 : 1)
  const filePath = args.find((a) => a.endsWith('.csv'))
  if (filePath) {
    pendingFilePath = filePath
  }

  createWindow()
  setupUpdater(mainWindow!)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC: window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize()
  else mainWindow?.maximize()
})
ipcMain.on('window-close', () => mainWindow?.close())

// IPC: open file dialog
ipcMain.handle('open-file-dialog', async (_event, mode: 'csv' | 'exe' = 'csv') => {
  const filters =
    mode === 'exe'
      ? [{ name: 'Executable', extensions: ['exe'] }, { name: 'All Files', extensions: ['*'] }]
      : [{ name: 'CSV Files', extensions: ['csv'] }, { name: 'All Files', extensions: ['*'] }]
  const result = await dialog.showOpenDialog({ filters, properties: ['openFile'] })
  return result.canceled ? null : result.filePaths[0]
})

// IPC: open file in external app
ipcMain.handle('open-external', async (_event, filePath: string, externalApp?: string) => {
  if (externalApp) {
    const { exec } = await import('child_process')
    exec(`"${externalApp}" "${filePath}"`)
  } else {
    shell.openPath(filePath)
  }
})

// IPC: read file
ipcMain.handle('read-file', async (_event, filePath: string) => {
  const { readFile } = await import('fs/promises')
  try {
    const content = await readFile(filePath, 'utf-8')
    return { ok: true, content }
  } catch (e: unknown) {
    return { ok: false, error: String(e) }
  }
})

// IPC: get app version
ipcMain.handle('get-version', () => app.getVersion())
