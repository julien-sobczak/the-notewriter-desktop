import fs from 'fs'
import path from 'path'
import os from 'os'
import { EventEmitter } from 'events'
import * as childProcess from 'child_process'
import ConfigManager from './config'

jest.mock('child_process')

const mockSpawn = childProcess.spawn as jest.MockedFunction<typeof childProcess.spawn>

// Helper to create a mock ChildProcess that emits 'close' with the given exit code
function createMockProcess(exitCode: number): any {
  const mockProc = new EventEmitter() as any
  mockProc.stdout = new EventEmitter()
  mockProc.stderr = new EventEmitter()
  process.nextTick(() => mockProc.emit('close', exitCode))
  return mockProc
}

const repoConfigJson = JSON.stringify({
  core: {
    extensions: ['md', 'markdown'],
    medias: { command: 'ffmpeg', parallel: 1, preset: 'ultrafast' }
  }
})

describe('ConfigManager', () => {
  let env: any
  let ntHomeDir: string

  // mocking the environment
  beforeEach(() => {
    ntHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nt-'))
    env = process.env
    process.env = { ...process.env, NT_HOME: ntHomeDir }
    mockSpawn.mockReset()
  })

  // restoring everything back
  afterEach(() => {
    process.env = env
  })

  test('read configuration files', async () => {
    fs.writeFileSync(
      path.join(ntHomeDir, 'editorconfig.json'),
      `
{
  "repositories": [
    {
      "name": "Main",
      "slug": "main",
      "path": "${ntHomeDir}/main"
    },
    {
      "name": "My Company",
      "slug": "my-company",
      "path": "${ntHomeDir}/work",
      "selected": false
    }
  ]
}
`
    )

    fs.mkdirSync(path.join(ntHomeDir, 'main/.nt'), { recursive: true })
    fs.writeFileSync(
      path.join(ntHomeDir, 'main/.nt/.config.json'),
      `
{
  "core": {
    "extensions": [
      "md",
      "markdown"
    ],
    "medias": {
      "command": "ffmpeg",
      "parallel": 1,
      "preset": "ultrafast"
    }
  }
}
`
    )

    fs.mkdirSync(path.join(ntHomeDir, 'work/.nt'), { recursive: true })
    fs.writeFileSync(
      path.join(ntHomeDir, 'work/.nt/.config.json'),
      `
{
  "core": {
    "extensions": [
      "md",
      "markdown"
    ],
    "medias": {
      "command": "ffmpeg",
      "parallel": 1,
      "preset": "ultrafast"
    }
  }
}
`
    )

    const configManager = await ConfigManager.create(ntHomeDir)
    expect(Object.keys(configManager.repositoryConfigs).length).toBe(2)
  })

  test('does not run nt version when config.jsonnet does not exist', async () => {
    const repoPath = path.join(ntHomeDir, 'main')
    fs.mkdirSync(path.join(repoPath, '.nt'), { recursive: true })
    fs.writeFileSync(path.join(repoPath, '.nt/.config.json'), repoConfigJson)

    const configManager = new ConfigManager()
    const repository = { name: 'Main', slug: 'main', path: repoPath, selected: true }
    await configManager.registerRepository(repository)

    expect(mockSpawn).not.toHaveBeenCalled()
    expect(configManager.repositoryConfigs['main']).toBeDefined()
  })

  test('does not run nt version when .config.json is newer than config.jsonnet', async () => {
    const repoPath = path.join(ntHomeDir, 'main')
    fs.mkdirSync(path.join(repoPath, '.nt'), { recursive: true })

    const oldDate = new Date('2024-01-01')
    const newDate = new Date('2024-01-02')

    fs.writeFileSync(path.join(repoPath, '.nt/config.jsonnet'), '{}')
    fs.utimesSync(path.join(repoPath, '.nt/config.jsonnet'), oldDate, oldDate)

    fs.writeFileSync(path.join(repoPath, '.nt/.config.json'), repoConfigJson)
    fs.utimesSync(path.join(repoPath, '.nt/.config.json'), newDate, newDate)

    const configManager = new ConfigManager()
    const repository = { name: 'Main', slug: 'main', path: repoPath, selected: true }
    await configManager.registerRepository(repository)

    expect(mockSpawn).not.toHaveBeenCalled()
    expect(configManager.repositoryConfigs['main']).toBeDefined()
  })

  test('runs nt version when config.jsonnet is newer than .config.json', async () => {
    const repoPath = path.join(ntHomeDir, 'main')
    fs.mkdirSync(path.join(repoPath, '.nt'), { recursive: true })

    const oldDate = new Date('2024-01-01')
    const newDate = new Date('2024-01-02')

    fs.writeFileSync(path.join(repoPath, '.nt/.config.json'), repoConfigJson)
    fs.utimesSync(path.join(repoPath, '.nt/.config.json'), oldDate, oldDate)

    fs.writeFileSync(path.join(repoPath, '.nt/config.jsonnet'), '{}')
    fs.utimesSync(path.join(repoPath, '.nt/config.jsonnet'), newDate, newDate)

    mockSpawn.mockReturnValue(createMockProcess(0))

    const configManager = new ConfigManager()
    const repository = { name: 'Main', slug: 'main', path: repoPath, selected: true }
    await configManager.registerRepository(repository)

    expect(mockSpawn).toHaveBeenCalledWith(
      'nt',
      ['version'],
      expect.objectContaining({ cwd: repoPath })
    )
    expect(configManager.repositoryConfigs['main']).toBeDefined()
  })

  test('throws when nt version exits with non-zero exit code', async () => {
    const repoPath = path.join(ntHomeDir, 'main')
    fs.mkdirSync(path.join(repoPath, '.nt'), { recursive: true })

    const oldDate = new Date('2024-01-01')
    const newDate = new Date('2024-01-02')

    fs.writeFileSync(path.join(repoPath, '.nt/.config.json'), repoConfigJson)
    fs.utimesSync(path.join(repoPath, '.nt/.config.json'), oldDate, oldDate)

    fs.writeFileSync(path.join(repoPath, '.nt/config.jsonnet'), '{}')
    fs.utimesSync(path.join(repoPath, '.nt/config.jsonnet'), newDate, newDate)

    mockSpawn.mockReturnValue(createMockProcess(1))

    const configManager = new ConfigManager()
    const repository = { name: 'Main', slug: 'main', path: repoPath, selected: true }
    await expect(configManager.registerRepository(repository)).rejects.toThrow(
      "'nt version' exited with code 1"
    )
  })
})
