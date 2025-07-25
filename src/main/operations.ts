import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';
import type { PackFile, RepositoryRefConfig } from '../shared/Model';
import { normalizePath } from './util';

export default class OperationsManager {
  repositories: Map<string, RepositoryRefConfig>;

  constructor() {
    this.repositories = new Map();
  }

  registerRepository(repository: RepositoryRefConfig): this {
    this.repositories.set(repository.slug, repository);

    const repositoryPath = normalizePath(repository.path);
    if (true) return this; // FIXME remove
    const walPath = path.join(repositoryPath, '.nt/operations/wal');
    if (!fs.existsSync(walPath)) {
      // Create the operations directory if it doesn't exist
      fs.mkdirSync(walPath, { recursive: true });
    }
    const currentWalFile = path.join(walPath, '001.pack');
    if (!fs.existsSync(currentWalFile)) {
      const wal: PackFile = {
        oid: '0000000000000000000000000000000000000000', // TODO generate a proper OID
        fileMtime: '', // Operations doesn't back up a file on disk
        fileSize: 0,
        ctime: new Date().toISOString(),
        packObjects: [],
        blobRefs: [],
      };
      this.writePackFile(repository.slug, wal);
    }

    return this;
  }

  writePackFileToDisk(
    repositorySlug: string,
    packFile: PackFile,
    filepath: string,
  ): void {
    const repository = this.repositories.get(repositorySlug);
    if (!repository) {
      throw new Error(`Repository ${repositorySlug} not found`);
    }
    // Write the pack file to disk
    const yamlStr = yaml.dump(packFile, { noRefs: true, skipInvalid: true });
    fs.writeFileSync(filepath, yamlStr, 'utf8');
  }

  writePackFile(repositorySlug: string, packFile: PackFile): void {
    const repository = this.repositories.get(repositorySlug);
    if (!repository) {
      throw new Error(`Repository ${repositorySlug} not found`);
    }
    const walPath = path.join(repository?.path, '.nt/operations/wal/001.pack');
    this.writePackFileToDisk(repositorySlug, packFile, walPath);
  }
}
