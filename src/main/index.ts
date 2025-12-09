import { app, shell, BrowserWindow, ipcMain, clipboard, globalShortcut } from 'electron'
import path, { join } from 'path'
import fs from 'fs'
import os from 'os'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import ConfigManager from './config'
import DatabaseManager from './database'
import OperationsManager from './operations'
import { normalizePath } from './util'
import {
  CommandExecution,
  Deck,
  DeckConfig,
  DeckRef,
  determineNextReminder,
  EditorDynamicConfig,
  Flashcard,
  Note,
  NoteRef,
  Query,
  Review
} from './Model'
import { exec, spawn } from 'child_process'
import { generateOid } from './oid'

// These will be initialized asynchronously
let config: ConfigManager
let db: DatabaseManager
let op: OperationsManager
let configSaved = false // true after saving configuration back to file before closing the application

// Check if we are inside a repository by walking up the directory tree
// Returns the repository root path if found, empty string otherwise
function insideRepository(): string {
  const homeDir = os.homedir()
  let currentDir = process.cwd()

  // Walk up the directory tree
  while (currentDir !== '/' && currentDir !== homeDir) {
    const ntDir = path.join(currentDir, '.nt')
    const configFile = path.join(ntDir, 'editorconfig.jsonnet')
    
    // Check if .nt directory exists and contains editorconfig.jsonnet
    if (fs.existsSync(ntDir) && fs.statSync(ntDir).isDirectory()) {
      // We found a .nt directory, return this as the repository root
      return currentDir
    }
    
    // Move to parent directory
    const parentDir = path.dirname(currentDir)
    
    // Prevent infinite loop if dirname returns the same path
    if (parentDir === currentDir) {
      break
    }
    
    currentDir = parentDir
  }

  return ''
}

// Initialize configuration asynchronously
async function initializeConfig() {
  // Determine launch context and create appropriate ConfigManager
  // Check if a directory argument was provided
  // process.argv[0] = node/electron executable
  // process.argv[1] = script path (main.js)
  // process.argv[2+] = user arguments
  const args = process.argv.slice(2)
  
  if (args.length > 0 && fs.existsSync(args[0])) {
    const argPath = path.resolve(args[0])
    if (fs.statSync(argPath).isDirectory()) {
      const ntDir = path.join(argPath, '.nt')
      if (fs.existsSync(ntDir) && fs.statSync(ntDir).isDirectory()) {
        console.log(`Launched with repository argument: ${argPath}`)
        config = await ConfigManager.createFromRepository(argPath)
        return
      }
    }
  }

  // Check if current working directory or parent is a repository
  const repositoryPath = insideRepository()
  if (repositoryPath) {
    console.log(`Launched from repository: ${repositoryPath}`)
    config = await ConfigManager.createFromRepository(repositoryPath)
    return
  }

  // Default: use NT_HOME or ~/.nt (multi-repository mode)
  console.log('Launched in standard mode')
  const ntHome = process.env.NT_HOME || path.join(os.homedir(), '.nt')
  config = await ConfigManager.create(ntHome)
}

// Initialize database asynchronously
async function initializeDatabase() {
  db = await DatabaseManager.create()
  config.repositories().forEach((repository) => db.registerRepository(repository))
}

// Initialize operations asynchronously
async function initializeOperations() {
  op = await OperationsManager.create()
  config.repositories().forEach((repository) => op.registerRepository(repository))
}

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    ...(process.platform === 'linux' ? { icon } : {}),
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    webPreferences: {
      // Impossible to reference local files in <img src="file://" /> with the default settings.
      // See https://stackoverflow.com/questions/61623156/electron-throws-not-allowed-to-load-local-resource-when-using-showopendialog
      // A non-optimal solution is to disable the security:
      webSecurity: false, // TODO use a custom protocol instead

      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined')
    }

    // Forward configuration state
    mainWindow.webContents.send('configuration-loaded', {
      static: config.editorStaticConfig,
      dynamic: config.editorDynamicConfig,
      repositories: config.repositoryConfigs
    })

    if (process.env.START_MINIMIZED) {
      mainWindow.minimize()
    } else {
      mainWindow.maximize()
      mainWindow.show()
    }
  })

  // Send configuration whenever the page finishes loading (including after refresh)
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined')
    }

    // Forward configuration state after page refresh
    mainWindow.webContents.send('configuration-loaded', {
      static: config.editorStaticConfig,
      dynamic: config.editorDynamicConfig,
      repositories: config.repositoryConfigs
    })
  })

  mainWindow.on('close', (event: any) => {
    if (!configSaved && mainWindow) {
      event.preventDefault()
      mainWindow.webContents.send('window-is-closing')
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({
      mode: 'right'
    })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Initialize config first
  await initializeConfig()
  await initializeDatabase()
  await initializeOperations()

  // Global shortcut are activated even when the window has not the focus
  globalShortcut.register('Alt+Space', () => {
    // I observed a beep when pressing a global shortcut using some combinations (ex: Control+CommandOrControl+F)
    // See this issue that seems related: https://github.com/electron/electron/issues/2617
    // A workaround is to customize the key binding on MacOS using a file
    // ~/Library/KeyBindings/DefaultKeyBinding.dic
    // Note: I no longer observe this behavior with the current shortcut.
    //
    // "Control+CommandOrControl+F" => Beep on MacOS
    // "Control+Shift+CommandOrControl+F" => OK on MacOS

    const windows = BrowserWindow.getAllWindows()
    if (windows.length === 0) {
      createWindow()
    } else {
      const mainOriginalWindow = windows[0]
      mainOriginalWindow.webContents.send('clean')
      mainOriginalWindow.show()
      mainOriginalWindow.focus()
    }
  })

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC communication setup
  ipcMain.on('edit', (_event, repositorySlug, relativePath, line) => {
    let relativeFileReference = relativePath
    if (line > 0) {
      relativeFileReference += `:${line}`
    }

    const repository = config.repositories().find((w) => w.slug === repositorySlug)
    if (!repository) {
      console.log(`Unknown repository ${repositorySlug}`)
      return
    }
    const repositoryPath = normalizePath(repository.path)

    // TODO support VISUAL/EDITOR-like env variables
    console.log(
      `Launching VS Code: code ${repositoryPath} -g ${repositoryPath}/${relativeFileReference}...`
    )

    const subprocess = spawn(
      'code',
      [repositoryPath, '-g', `${repositoryPath}/${relativeFileReference}`],
      {
        detached: true,
        stdio: 'ignore'
      }
    )
    subprocess.on('error', (err) => {
      console.error(`Failed to edit ${relativePath}`, err)
    })
  })

  ipcMain.on('browse-url', (_event, url) => {
    console.debug(`Browsing URL: ${url}`)
    shell.openExternal(url).catch((error) => {
      console.error(`Failed to open URL ${url}`, error)
    })
  })

  ipcMain.on('copy', (event, text) => {
    // 1. Use the clipboard API
    clipboard.writeText(text)
    console.log('Text copied to clipboard')

    // 2. Minimize the window
    const webContents = event.sender
    const win = BrowserWindow.fromWebContents(webContents)
    if (win != null) win.minimize()
  })

  ipcMain.on('copyText', (_event, text) => {
    if (!text) return
    console.debug(`Copy ${text}...`)
    clipboard.writeText(text)
    // new Notification({ title: "Copied!", body: text.substring(0, 10) + '...' }).show()
  })

  /* Two-way communication with the renderer process */
  ipcMain.handle('save-dynamic-config', (_event, dynamicConfig: EditorDynamicConfig) => {
    console.log('received save-dynamic-config')
    console.log('Saving...', dynamicConfig)
    config.save(dynamicConfig)
    configSaved = true
    mainWindow?.close()
    mainWindow = null
  })
  ipcMain.handle('list-files', async (_event, repositorySlug: string) => {
    console.debug(`Listing files in repository ${repositorySlug}`)
    const result = await db.listFiles([repositorySlug])
    console.debug(`Found ${result.length} files`)
    return result
  })
  ipcMain.handle(
    'list-notes-in-file',
    async (_event, repositorySlug: string, relativePath: string) => {
      console.debug(`Listing note in file ${relativePath} in repository ${repositorySlug}`)
      const result = await db.listNotesInFile(repositorySlug, relativePath)
      console.debug(
        `Found ${result.length} notes for file ${relativePath} in repository ${repositorySlug}`
      )
      return result
    }
  )

  ipcMain.handle('list-gotos', async (_event, repositorySlugs: string[]) => {
    const gotos = await db.getGotos(repositorySlugs)
    console.debug(`Found ${gotos.length} Goto links in all repositories`)
    return gotos
  })

  ipcMain.handle('find-by-wikilink', async (_event, repositorySlug: string, wikilink: string) => {
    console.debug(`Finding note from wikilink ${wikilink} in repository ${repositorySlug}`)
    const result = await db.findByWikilink(repositorySlug, wikilink)
    console.debug(`Found note for wikilink ${wikilink} in repository ${repositorySlug}`)
    return result
  })
  ipcMain.handle('find', async (_event, noteRef: NoteRef) => {
    console.debug(`Finding note from ref ${noteRef.oid}`)
    const result = await db.find(noteRef)
    console.debug(`Found note for ref ${result.oid}`)
    return result
  })
  ipcMain.handle('mfind', async (_event, noteRefs: NoteRef[]) => {
    console.debug(`Finding notes for ${noteRefs.length} note ref(s)`)
    const results = await db.multiFind(noteRefs)
    console.debug(`Found ${results.length} note(s)`)
    return results
  })

  async function doSearch(query: Query) {
    console.debug(`Searching for "${query.q}" in repositories ${query.repositories}`)
    const result = await db.search(query)
    console.debug(`Found ${result.notes.length} notes`)
    return result
  }
  ipcMain.handle('search', async (_event, query: Query) => {
    return doSearch(query)
  })

  ipcMain.handle('msearch', async (_event, queries: Query[]) => {
    const results = await db.multiSearch(queries)
    return results
  })

  ipcMain.handle('get-daily-quote', async () => {
    const { dailyQuote } = config.editorStaticConfig
    if (!dailyQuote) {
      throw new Error('No daily quote found')
    }
    const query: Query = {
      q: dailyQuote.query,
      repositories: dailyQuote.repositories,
      blockOid: undefined,
      deskOid: undefined,
      limit: 0,
      shuffle: false
    }
    const note = await db.searchDailyQuote(query)
    return note
  })

  ipcMain.handle(
    'get-note-statistics',
    async (_event, repositorySlugs: string[], query: string, groupBy: string, value?: string) => {
      console.debug(`Getting note statistics for query "${query}" with groupBy ${groupBy}`)
      const result = await db.getNoteStatistics(repositorySlugs, query, groupBy, value)
      console.debug(`Found ${result.length} statistics`)
      return result
    }
  )

  ipcMain.handle('count-objects', async (_event, repositorySlugs: string[]) => {
    console.debug(`Counting objects for ${repositorySlugs}`)
    const result = await db.countObjects(repositorySlugs)
    console.debug(`Found ${result.size} object types`)
    return result
  })

  ipcMain.handle('get-medias-disk-usage', async (_event, repositorySlugs: string[]) => {
    console.debug(`Getting media disk usage for ${repositorySlugs}`)
    const result = await db.getMediasDiskUsage(repositorySlugs)
    console.debug(`Found ${result.length} media directories`)
    return result
  })

  ipcMain.handle('get-pending-reminders', async (_event, repositorySlugs: string[]) => {
    console.debug(`Getting pending reminders for ${repositorySlugs}`)
    const result = await db.getPendingReminders(repositorySlugs)
    console.debug(`Found ${result.length} pending reminders`)
    return result
  })

  ipcMain.handle('get-past-memories', async (_event, repositorySlugs: string[]) => {
    console.debug(`Getting past memories for ${repositorySlugs}`)
    const result = await db.getPastMemories(repositorySlugs)
    console.debug(`Found ${result.length} past memories`)
    return result
  })

  ipcMain.handle('complete-reminders', async (_event, reminderOids: string[]) => {
    console.debug(`Completing reminders: ${reminderOids}`)

    // First, get all reminder details to get their repository slugs
    const allReminders = await db.getPendingReminders([])
    const remindersToComplete = allReminders.filter((r) => reminderOids.includes(r.oid))

    const lastPerformedAt = new Date()

    // Complete each reminder by appending the operation to WAL and updating database
    for (const reminder of remindersToComplete) {
      // Append operation to WAL
      op.appendOperationToWal(reminder.repositorySlug, {
        oid: generateOid(),
        object_oid: reminder.oid,
        name: 'complete-reminder',
        timestamp: lastPerformedAt.toISOString(),
        extras: {}
      })

      // Update the SQLite database immediately.
      // Avoid having to load the pack files when the WAL will be flushed
      // (and useful as the reminders may be rescheduled before the next flush).
      try {
        const nextPerformedAt = determineNextReminder(reminder, lastPerformedAt)
        const updatedReminder = await db.updateReminder(
          reminder.repositorySlug,
          reminder.oid,
          nextPerformedAt
        )
        console.debug(
          `Reminder ${updatedReminder.oid} updated with new date:`,
          updatedReminder.nextPerformedAt
        )
      } catch (error) {
        console.error(`Error updating reminder ${reminder.oid}:`, error)
        // Continue processing other reminders even if one fails
      }
    }

    console.debug(`Completed ${remindersToComplete.length} reminders`)
  })

  ipcMain.handle('list-decks', async (_event, repositorySlugs: string[]) => {
    console.debug(`Listing decks for repositories ${repositorySlugs}`)
    const decks: Deck[] = []
    const statsPromises: Promise<void>[] = []
    for (const repositorySlug of repositorySlugs) {
      const repositoryConfig = config.repositoryConfigs[repositorySlug]
      if (!repositoryConfig.decks) continue // No decks configured for this repository

      for (let i = 0; i < repositoryConfig.decks.length; i++) {
        const deckConfig = repositoryConfig.decks[i]
        console.log(`Retrieving stats for deck ${deckConfig.name} in repository ${repositorySlug}`)
        const promise = db.getDeckStats(repositorySlug, deckConfig).then((deckStats) => {
          console.debug(`Found stats for deck ${deckConfig.name}`)
          // BUG FIXME now what if no rows are returned?????
          decks.push({
            repositorySlug,
            name: deckConfig.name,
            config: deckConfig,
            stats: deckStats
          })
        })
        statsPromises.push(promise)
      }
    }

    await Promise.all(statsPromises)

    console.debug(`Found ${decks.length} decks for repositories ${repositorySlugs}`)
    return decks
  })
  ipcMain.handle('list-today-flashcards', async (_event, deckRef: DeckRef) => {
    console.debug(
      `Listing flashcards for today for repository ${deckRef.repositorySlug} and deck ${deckRef.name}`
    )
    const repositoryConfig = config.repositoryConfigs[deckRef.repositorySlug]

    // Find the deck config
    let deckConfig: DeckConfig | undefined
    for (const deck of repositoryConfig.decks) {
      if (deck.name === deckRef.name) {
        deckConfig = deck
        break
      }
    }

    if (!deckConfig) {
      console.error(
        `No deck configuration found for key ${deckRef.name} in repository ${deckRef.repositorySlug}`
      )
      return [] // Send an empty array as response to stop the execution
    }

    const flashcards = await db.getTodayFlashcards(deckRef.repositorySlug, deckConfig)
    console.debug(
      `Found ${flashcards.length} flashcards to study today for deck ${deckRef.name} in repository ${deckRef.repositorySlug}`
    )
    return flashcards
  })

  ipcMain.handle('flush-operations', async (_event, repositorySlugs: string[]) => {
    for (const repositorySlug of repositorySlugs) {
      console.debug(`Flushing operations for repository ${repositorySlug}...`)
      await op.flushWalToPackFiles(repositorySlug)
      console.debug(`Flushed operations for repository ${repositorySlug}`)
    }
  })
  ipcMain.handle(
    'review-flashcard',
    async (_event, deckRef: DeckRef, flashcard: Flashcard, review: Review): Promise<Flashcard> => {
      const deckConfig = config.mustGetDeckConfig(deckRef)
      const algorithmName = deckConfig.algorithm || 'default'
      // IMPROVEMENT use algorithmSettings to customize the algorithm
      if (algorithmName !== 'default' && algorithmName !== 'Anki2') {
        throw new Error(`Algorithm ${algorithmName} is not supported yet`)
      }

      // Record the operation in the WAL
      op.appendOperationToWal(deckRef.repositorySlug, {
        oid: generateOid(),
        object_oid: flashcard.oid,
        name: 'review-flashcard',
        timestamp: new Date().toISOString(),
        extras: { review }
      })
      console.debug(
        `Reviewing flashcard for repository ${deckRef.repositorySlug} and deck ${deckRef.name} and review ${review.feedback}` // TODO reword this message
      )

      // Update the SQLite database immediately.
      // Avoid having to load the pack files when the WAL will be flushed
      // (and useful as the flashcard may be rescheduled before the next flush).
      return db
        .updateFlashcard(deckRef.repositorySlug, deckConfig, flashcard)
        .then((updatedFlashcard: Flashcard) => {
          console.debug(
            `Flashcard ${updatedFlashcard.oid} updated with new settings:`,
            updatedFlashcard.settings
          )
          return updatedFlashcard
        })
        .catch((error: unknown) => {
          console.error('Error updating flashcard:', error)
          return flashcard // Return the original flashcard in case of error
        })
    }
  )

  ipcMain.handle('run-hooks', async (_event, note: Note): Promise<CommandExecution> => {
    console.debug(`Running hooks for note ${note.wikilink}`)

    const startTime = Date.now()

    return new Promise((resolve) => {
      console.log(`Executing hooks for ${note.wikilink} from ${note.repositoryPath}...`)
      const subprocess = spawn('nt', ['run-hook', '--vvv', note.wikilink], {
        cwd: note.repositoryPath,
        env: {
          ...process.env,
          NT_HOME: '' // Avoid propagating NT_HOME also used by the-notewriter-desktop
        },
        stdio: 'pipe'
      })

      let stdout = ''
      let stderr = ''

      subprocess.stdout.on('data', (data) => {
        stdout += data.toString()
      })

      subprocess.stderr.on('data', (data) => {
        stderr += data.toString()
      })

      subprocess.on('close', (exitCode) => {
        const duration = Date.now() - startTime
        const result: CommandExecution = {
          exitCode: exitCode || 0,
          duration,
          stdout,
          stderr
        }
        console.debug(`Hook execution completed for ${note.wikilink}:`, result)
        resolve(result)
      })

      subprocess.on('error', (error) => {
        const duration = Date.now() - startTime
        const result: CommandExecution = {
          exitCode: 1,
          duration,
          stdout,
          stderr: stderr + error.message
        }
        console.error(`Error running hooks for ${note.wikilink}:`, error)
        resolve(result)
      })
    })
  })

  // Journal operations
  ipcMain.handle('read-note-file', async (_event, repositorySlug: string, filePath: string) => {
    console.debug(`Reading note file ${filePath} in repository ${repositorySlug}`)

    try {
      // Get repository configuration
      const repository = config.repositories().find((repo) => repo.slug === repositorySlug)
      if (!repository) {
        throw new Error(`Repository ${repositorySlug} not found`)
      }

      // Normalize the repository path
      const repositoryPath = normalizePath(repository.path)

      // Resolve the full file path
      const fullFilePath = path.join(repositoryPath, filePath)

      // Read file content
      if (!fs.existsSync(fullFilePath)) {
        console.warn(`File ${fullFilePath} does not exist`)
        return '' // Return empty content for non-existing files
      }

      const content = fs.readFileSync(fullFilePath, 'utf8')
      console.debug(`Successfully read content from ${fullFilePath}`)
      return content
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error)
      throw error
    }
  })
  ipcMain.handle(
    'append-to-file',
    async (_event, repositorySlug: string, filePath: string, content: string) => {
      console.debug(`Appending to file ${filePath} in repository ${repositorySlug}`)

      try {
        // Get repository configuration
        const repository = config.repositories().find((repo) => repo.slug === repositorySlug)
        if (!repository) {
          throw new Error(`Repository ${repositorySlug} not found`)
        }

        // Normalize the repository path
        const repositoryPath = normalizePath(repository.path)

        // Resolve the full file path
        const fullFilePath = path.join(repositoryPath, filePath)

        // Ensure directory exists
        const dir = path.dirname(fullFilePath)
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }

        // Append content to file
        fs.appendFileSync(fullFilePath, content, 'utf8')

        console.debug(`Successfully appended content to ${fullFilePath}`)
        return true
      } catch (error) {
        console.error(`Error appending to file ${filePath}:`, error)
        throw error
      }
    }
  )

  ipcMain.handle(
    'determine-journal-activity',
    async (_event, repositorySlug: string, pathPrefix: string) => {
      console.debug(
        `Determining journal activity for repository ${repositorySlug} with prefix ${pathPrefix}`
      )
      return db.determineJournalActivity(repositorySlug, pathPrefix)
    }
  )

  ipcMain.handle(
    'find-journal-entries',
    async (_event, repositorySlug: string, pathPrefix: string, start: string, end: string) => {
      console.debug(
        `Finding journal entries for repository ${repositorySlug} with prefix ${pathPrefix} from ${start} to ${end}`
      )
      return db.findJournalEntries(repositorySlug, pathPrefix, start, end)
    }
  )

  ipcMain.handle('force-add', async (_event, repositorySlug: string, filePath: string) => {
    console.debug(`Force adding file ${filePath} in repository ${repositorySlug}`)

    try {
      // Get repository configuration
      const repository = config.repositories().find((repo) => repo.slug === repositorySlug)
      if (!repository) {
        throw new Error(`Repository ${repositorySlug} not found`)
      }

      // Normalize the repository path
      const repositoryPath = normalizePath(repository.path)

      // Resolve the full file path
      const fullFilePath = path.join(repositoryPath, filePath)

      // Check if file exists
      if (!fs.existsSync(fullFilePath)) {
        throw new Error(`File ${fullFilePath} does not exist`)
      }

      // IMPROVEMENT introduce a NtRunner abstraction
      // Execute nt add command
      return new Promise((resolve, reject) => {
        exec(
          `nt add "${fullFilePath}"`,
          {
            cwd: repositoryPath,
            env: {
              ...process.env,
              NT_HOME: '' // Avoid propagating NT_HOME also used by the-notewriter-desktop
            }
          },
          (error: any, stdout: string, stderr: string) => {
            if (error) {
              console.error(`Error executing nt add: ${error}`)
              reject(error)
              return
            }
            if (stderr) {
              console.warn(`nt add stderr: ${stderr}`)
            }
            console.info(`nt add stdout: ${stdout}`)
            resolve(true)
          }
        )
      })
    } catch (error) {
      console.error(`Error force adding file ${filePath}:`, error)
      throw error
    }
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  // if (process.platform !== 'darwin') {
  //   app.quit();
  // }
  app.quit() // FIXME uncomment above lines when development is complete
})
app.on('quit', () => {
  db.close()
})
