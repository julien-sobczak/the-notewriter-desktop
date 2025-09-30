import fs from 'fs';
import path from 'path';
import os from 'os';
import ConfigManager from './config';

describe('ConfigManager', () => {
  let env: any;
  let ntHomeDir: string;

  // mocking the environment
  beforeEach(() => {
    ntHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nt-'));
    env = process.env;
    process.env = { ...process.env, NT_HOME: ntHomeDir };
  });

  test('read configuration files (YAML)', async () => {
    fs.writeFileSync(
      path.join(ntHomeDir, 'editorconfig.yaml'),
      `
repositories:
- name: Main
  slug: main
  path: ${ntHomeDir}/main
- name: My Company
  slug: my-company
  path: ${ntHomeDir}/work
  selected: false
`,
    );

    fs.mkdirSync(path.join(ntHomeDir, 'main/.nt'), { recursive: true });
    fs.writeFileSync(
      path.join(ntHomeDir, 'main/.nt/.config.json'),
      `
{
  "Core": {
    "Extensions": [
      "md",
      "markdown"
    ],
    "Medias": {
      "Command": "ffmpeg",
      "Parallel": 1,
      "Preset": "ultrafast"
    }
  }
}
`,
    );

    fs.mkdirSync(path.join(ntHomeDir, 'work/.nt'), { recursive: true });
    fs.writeFileSync(
      path.join(ntHomeDir, 'work/.nt/.config.json'),
      `
{
  "Core": {
    "Extensions": [
      "md",
      "markdown"
    ],
    "Medias": {
      "Command": "ffmpeg",
      "Parallel": 1,
      "Preset": "ultrafast"
    }
  }
}
`,
    );

    const configManager = new ConfigManager();
    expect(Object.keys(configManager.repositoryConfigs).length).toBe(2);
  });

  test('read configuration files (Jsonnet)', async () => {
    fs.writeFileSync(
      path.join(ntHomeDir, 'editorconfig.jsonnet'),
      `
{
  repositories: [
    {
      name: 'Main',
      slug: 'main',
      path: '${ntHomeDir}/main',
    },
    {
      name: 'My Company',
      slug: 'my-company',
      path: '${ntHomeDir}/work',
      selected: false,
    },
  ],
}
`,
    );

    fs.mkdirSync(path.join(ntHomeDir, 'main/.nt'), { recursive: true });
    fs.writeFileSync(
      path.join(ntHomeDir, 'main/.nt/.config.json'),
      `
{
  "Core": {
    "Extensions": [
      "md",
      "markdown"
    ],
    "Medias": {
      "Command": "ffmpeg",
      "Parallel": 1,
      "Preset": "ultrafast"
    }
  }
}
`,
    );

    fs.mkdirSync(path.join(ntHomeDir, 'work/.nt'), { recursive: true });
    fs.writeFileSync(
      path.join(ntHomeDir, 'work/.nt/.config.json'),
      `
{
  "Core": {
    "Extensions": [
      "md",
      "markdown"
    ],
    "Medias": {
      "Command": "ffmpeg",
      "Parallel": 1,
      "Preset": "ultrafast"
    }
  }
}
`,
    );

    const configManager = await ConfigManager.create();
    expect(Object.keys(configManager.repositoryConfigs).length).toBe(2);
  });

  test('prioritize YAML over Jsonnet when both exist', async () => {
    // Create both YAML and Jsonnet files
    fs.writeFileSync(
      path.join(ntHomeDir, 'editorconfig.yaml'),
      `
repositories:
- name: YAML
  slug: yaml
  path: ${ntHomeDir}/yaml
`,
    );

    fs.writeFileSync(
      path.join(ntHomeDir, 'editorconfig.jsonnet'),
      `
{
  repositories: [
    {
      name: 'Jsonnet',
      slug: 'jsonnet',
      path: '${ntHomeDir}/jsonnet',
    },
  ],
}
`,
    );

    fs.mkdirSync(path.join(ntHomeDir, 'yaml/.nt'), { recursive: true });
    fs.writeFileSync(
      path.join(ntHomeDir, 'yaml/.nt/.config.json'),
      `
{
  "Core": {
    "Extensions": [
      "md"
    ],
    "Medias": {
      "Command": "ffmpeg",
      "Parallel": 1,
      "Preset": "ultrafast"
    }
  }
}
`,
    );

    // Test with synchronous constructor (should use YAML)
    const configManager = new ConfigManager();
    expect(configManager.editorStaticConfig.repositories[0].name).toBe('YAML');
    expect(configManager.editorStaticConfig.repositories[0].slug).toBe('yaml');

    // Test with async create (should also use YAML)
    const configManagerAsync = await ConfigManager.create();
    expect(configManagerAsync.editorStaticConfig.repositories[0].name).toBe(
      'YAML',
    );
  });

  // restoring everything back
  afterEach(() => {
    process.env = env;
  });
});
