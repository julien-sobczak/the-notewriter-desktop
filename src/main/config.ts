import path from 'path';
import os from 'os';
import fs from 'fs';
import YAML from 'yaml';

export interface Workspace {
  name: string;
  slug: string;
  path: string;
  selected: boolean;
}

export interface EditorConfig {
  workspaces: Workspace[];
}

export default class ConfigManager {
  editorConfig: EditorConfig;

  constructor() {
    // Ensure the configuration file exists
    const homeConfigPath1 = path.join(os.homedir(), '.nt/editorconfig.yaml');
    const homeConfigPath2 = path.join(os.homedir(), '.nt/editorconfig.yml');
    if (!fs.existsSync(homeConfigPath1) && !fs.existsSync(homeConfigPath2)) {
      throw new Error(`No configuration file not found in home directory`);
    }

    // We know only one path exists
    let homeConfigValidPath = homeConfigPath1;
    if (!fs.existsSync(homeConfigPath1)) {
      homeConfigValidPath = homeConfigPath2;
    }
    const data = fs.readFileSync(homeConfigValidPath, 'utf8');
    this.editorConfig = YAML.parse(data) as EditorConfig;
  }

  // Returns all declared workspaces.
  Workspaces(): Workspace[] {
    return this.editorConfig.workspaces;
  }

  // Returns only workspaces selected by default.
  SelectedWorkspaces(): Workspace[] {
    return this.editorConfig.workspaces.filter(
      (workspace) => workspace.selected
    );
  }
}
