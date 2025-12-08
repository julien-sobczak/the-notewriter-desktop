import fs from 'fs'
import path from 'path'
import os from 'os'
import ConfigManager from './config'

describe('ConfigManager - Single Repository Mode', () => {
  let env: any
  let tempRepoDir: string

  beforeEach(() => {
    // Save original environment
    env = process.env
    
    // Create a temporary repository directory
    tempRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nt-repo-'))
    
    // Create .nt directory to make it a valid repository
    fs.mkdirSync(path.join(tempRepoDir, '.nt'), { recursive: true })
    
    // Create a minimal repository config
    fs.writeFileSync(
      path.join(tempRepoDir, '.nt/.config.json'),
      JSON.stringify({
        core: {
          extensions: ['md', 'markdown'],
          medias: {
            command: 'ffmpeg',
            parallel: 1,
            preset: 'ultrafast'
          }
        }
      })
    )
  })

  afterEach(() => {
    // Restore environment
    process.env = env
    
    // Clean up temp directory
    if (fs.existsSync(tempRepoDir)) {
      fs.rmSync(tempRepoDir, { recursive: true, force: true })
    }
  })

  test('generates in-memory config when no editorconfig.jsonnet exists in repository', async () => {
    // Mock process.cwd to return our temp repository
    const originalCwd = process.cwd
    process.cwd = jest.fn(() => tempRepoDir)

    try {
      const configManager = await ConfigManager.create()
      
      // Verify single repository was created
      expect(configManager.editorStaticConfig.repositories).toHaveLength(1)
      
      const repo = configManager.editorStaticConfig.repositories[0]
      expect(repo.name).toBe('Default')
      expect(repo.slug).toBe('default')
      expect(repo.path).toBe(tempRepoDir)
      expect(repo.selected).toBe(true)
      
      // Verify repository config was loaded
      expect(Object.keys(configManager.repositoryConfigs)).toContain('default')
    } finally {
      // Restore process.cwd
      process.cwd = originalCwd
    }
  })

  test('reads editorconfig.jsonnet from repository .nt directory when it exists', async () => {
    // Create an editorconfig.jsonnet in the repository
    fs.writeFileSync(
      path.join(tempRepoDir, '.nt/editorconfig.jsonnet'),
      `{
        repositories: [
          {
            name: 'Custom',
            slug: 'custom',
            path: '${tempRepoDir}',
            selected: true
          }
        ]
      }`
    )

    // Mock process.cwd to return our temp repository
    const originalCwd = process.cwd
    process.cwd = jest.fn(() => tempRepoDir)

    try {
      // Note: This will fail if jsonnet is not installed
      // That's expected - we're just documenting the behavior
      try {
        const configManager = await ConfigManager.create()
        
        // Verify custom repository was loaded
        expect(configManager.editorStaticConfig.repositories).toHaveLength(1)
        
        const repo = configManager.editorStaticConfig.repositories[0]
        expect(repo.name).toBe('Custom')
        expect(repo.slug).toBe('custom')
      } catch (error: any) {
        // It's okay if jsonnet is not installed
        if (error.message.includes('jsonnet binary not found')) {
          console.log('Skipping test - jsonnet not installed')
        } else {
          throw error
        }
      }
    } finally {
      // Restore process.cwd
      process.cwd = originalCwd
    }
  })

  test('detects repository from current working directory', async () => {
    // Mock process.cwd to return our temp repository
    const originalCwd = process.cwd
    process.cwd = jest.fn(() => tempRepoDir)

    try {
      const configManager = await ConfigManager.create()
      
      // Verify it detected the repository and created default config
      expect(configManager.editorStaticConfig.repositories).toHaveLength(1)
      expect(configManager.editorStaticConfig.repositories[0].path).toBe(tempRepoDir)
    } finally {
      // Restore process.cwd
      process.cwd = originalCwd
    }
  })
})
