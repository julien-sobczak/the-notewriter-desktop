import path from 'path';
import os from 'os';
import fs from 'fs';
import YAML from 'yaml';

import {
  EditorStaticConfig,
  EditorDynamicConfig,
  Workspace,
  DailyQuote,
} from '../shared/Model';

export default class ConfigManager {
  editorStaticConfig: EditorStaticConfig;

  editorDynamicConfig: EditorDynamicConfig;

  constructor() {
    this.editorStaticConfig = ConfigManager.#readStaticConfig();
    this.editorDynamicConfig = ConfigManager.#readDynamicConfig();
  }

  // Returns the home directory except if the environment variable $NT_HOME is set.
  static #getHomeDir() {
    if (process.env.NT_HOME) {
      return process.env.NT_HOME;
    }
    return path.join(os.homedir(), '.nt');
  }

  static #readStaticConfig() {
    // Ensure the configuration file exists
    const homeConfigPath1 = path.join(
      ConfigManager.#getHomeDir(),
      'editorconfig.yaml'
    );
    const homeConfigPath2 = path.join(
      ConfigManager.#getHomeDir(),
      'editorconfig.yml'
    );
    if (!fs.existsSync(homeConfigPath1) && !fs.existsSync(homeConfigPath2)) {
      throw new Error(`No configuration file not found in home directory`);
    }

    // We know only one path exists
    let homeConfigValidPath = homeConfigPath1;
    if (!fs.existsSync(homeConfigPath1)) {
      homeConfigValidPath = homeConfigPath2;
    }

    console.log(`Reading configuration from ${homeConfigValidPath}`);
    const data = fs.readFileSync(homeConfigValidPath, 'utf8');
    const config = YAML.parse(data) as EditorStaticConfig;
    return ConfigManager.#applyDefaultStaticConfig(config);
  }

  static #readDynamicConfig() {
    const homeConfigPath = path.join(
      ConfigManager.#getHomeDir(),
      'editorconfig.json'
    );
    if (!fs.existsSync(homeConfigPath)) {
      // Define default configuration
      return {
        desks: [],
        favorites: [],
      } as EditorDynamicConfig;
    }

    const data = fs.readFileSync(homeConfigPath, 'utf8');
    return JSON.parse(data) as EditorDynamicConfig;
  }

  // Traverse the static configuration to apply default values.
  static #applyDefaultStaticConfig(
    config: EditorStaticConfig
  ): EditorStaticConfig {
    // Select workspaces by default
    if (config.workspaces) {
      for (let i = 0; i < config.workspaces.length; i++) {
        const workspace = config.workspaces[i];
        if (workspace.selected == null) {
          // Workspaces are selected by default
          workspace.selected = true;
        }
      }
    }

    const defaultDailyQuote: DailyQuote = {
      query: `@kind:quote`, // any quote
      workspaces: [], // any workspace
    };

    if (!config.inspirations) {
      config.inspirations = {
        dailyQuote: defaultDailyQuote,
        categories: [],
      };
    }
    // Define default daily quote
    if (!config.inspirations.dailyQuote) {
      config.inspirations.dailyQuote = defaultDailyQuote;
    }

    return config;
  }

  // Returns all declared workspaces.
  workspaces(): Workspace[] {
    return this.editorStaticConfig.workspaces;
  }

  // Returns only workspaces selected by default.
  selectedWorkspaces(): Workspace[] {
    return this.editorStaticConfig.workspaces.filter(
      (workspace) => workspace.selected
    );
  }

  // eslint-disable-next-line class-methods-use-this
  save(config: EditorDynamicConfig) {
    const homeConfigPath = path.join(
      ConfigManager.#getHomeDir(),
      'editorconfig.json'
    );
    console.log(`Saving ${homeConfigPath}...`);
    fs.writeFile(homeConfigPath, JSON.stringify(config), (err) => {
      if (err) {
        console.error(err);
      }
    });
  }
}
