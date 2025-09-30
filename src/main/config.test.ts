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

  // restoring everything back
  afterEach(() => {
    process.env = env;
  });
});
