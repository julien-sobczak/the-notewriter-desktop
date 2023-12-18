import fs from 'fs';
import path from 'path';
import os from 'os';
import { load } from 'js-toml';
import { CollectionConfig } from 'shared/Model';
import ConfigManager from './config';

beforeEach(() => {});

afterEach(() => {});

// Learnign test to demonstrate js-toml working
test('js-toml', () => {
  const data = load(`
[core]
extensions = ["md", "markdown"]

[search.quotes]
q = "-#ignore @kind:quote"
name = "Favorite Quotes"

[deck.life]
name = "Life"
query = "path:skills"
newFlashcardsPerDay = 10
algorithmSettings.easeFactor = 2.5

[deck.programming]
name = "Programming"
query = "#programming"
newFlashcardsPerDay = 5
algorithmSettings.easeFactor = 1.5`) as CollectionConfig;

  // Check extract values
  expect(data?.deck).toHaveProperty('life');
  expect(data?.deck).toHaveProperty('programming');
  expect(data?.deck?.life).toBeTruthy();
  expect(data?.deck?.life?.algorithmSettings.easeFactor).toBe(2.5);
  expect(data?.deck?.programming?.algorithmSettings.easeFactor).toBe(1.5);
});

describe('ConfigManager', () => {
  let env: any;
  let ntHomeDir: string;

  // mocking the environment
  beforeEach(() => {
    ntHomeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nt-'));
    env = process.env.NT_HOME;
    process.env = { NT_HOME: ntHomeDir };
  });

  test('read configuration files', async () => {
    fs.writeFileSync(
      path.join(ntHomeDir, 'editorconfig.yaml'),
      `
workspaces:
- name: Main
  slug: main
  path: ${ntHomeDir}/main
- name: My Company
  slug: my-company
  path: ${ntHomeDir}/work
  selected: false
`
    );

    fs.mkdirSync(path.join(ntHomeDir, 'main/.nt'), { recursive: true });
    fs.writeFileSync(
      path.join(ntHomeDir, 'main/.nt/config'),
      `
[core]
extensions = ["md", "markdown"]

[search.quotes]
q = "-#ignore @kind:quote"
name = "Favorite Quotes"

[deck.life]
name = "Life"
query = "path:skills"
newFlashcardsPerDay = 10
algorithmSettings.easeFactor = 2.5

[deck.programmming]
name = "Programming"
query = "#programming"
newFlashcardsPerDay = 5
algorithmSettings.easeFactor = 1.5
`
    );

    fs.mkdirSync(path.join(ntHomeDir, 'work/.nt'), { recursive: true });
    fs.writeFileSync(
      path.join(ntHomeDir, 'work/.nt/config'),
      `
[core]
extensions = ["md", "markdown"]
`
    );

    const configManager = new ConfigManager();
    expect(configManager.collectionConfigs).toHaveLength(2);
  });

  // restoring everything back
  afterEach(() => {
    process.env = env;
  });
});
