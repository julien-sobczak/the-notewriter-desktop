/* eslint-disable max-classes-per-file */
import fs from 'fs';
import yaml from 'js-yaml';
import { gzipSync, gunzipSync } from 'zlib';
import path from 'path';
import type {
  Operation,
  PackFile,
  PackObject,
  RepositoryRefConfig,
} from '../shared/Model';
import { normalizePath } from './util';
import { generateOid } from './oid';

export class ObjectData {
  value: any;

  constructor(value: any) {
    this.value = value;
  }

  toCompressedBase64(): string {
    const yamlData = yaml.dump(this.value);
    const compressed = gzipSync(yamlData);
    return compressed.toString('base64');
  }

  static fromCompressedBase64(data: string): ObjectData {
    const buffer = Buffer.from(data, 'base64');
    const decompressed = gunzipSync(buffer);
    const yamlData = decompressed.toString('utf8');
    const value = yaml.load(yamlData);
    return new ObjectData(value);
  }
}

export default class OperationsManager {
  repositories: Map<string, RepositoryRefConfig>;

  maxWalSize: number;

  private constructor(options?: { maxWalSize?: number }) {
    this.repositories = new Map();
    this.maxWalSize = options?.maxWalSize ?? 1024 * 1024 * 10; // 10 MB default
  }

  // Async factory method for creating OperationsManager
  static async create(options?: { maxWalSize?: number }): Promise<OperationsManager> {
    return new OperationsManager(options);
  }

  registerRepository(repository: RepositoryRefConfig): this {
    const savedRepository = {
      ...repository,
      path: normalizePath(repository.path), // Replace ~ or $PWD
    };
    this.repositories.set(repository.slug, savedRepository);
    return this;
  }

  // Append an operation to the Write-Ahead Log (WAL)
  appendOperationToWal(repositorySlug: string, operation: Operation): this {
    const repository = this.repositories.get(repositorySlug);
    if (!repository) {
      throw new Error(`Repository ${repositorySlug} not found`);
    }

    const repositoryPath = normalizePath(repository.path);

    const walPath = path.join(repositoryPath, '.nt/operations/wal');
    if (!fs.existsSync(walPath)) {
      // Create the operations directory if it doesn't exist
      fs.mkdirSync(walPath, { recursive: true });
    }

    // Check current wal.json for rotation
    const walFilePath = path.join(walPath, 'wal.json');
    if (fs.existsSync(walFilePath)) {
      const stats = fs.statSync(walFilePath);
      console.log(`Current WAL file size: ${stats.size} bytes`); // FIXME remove
      // If the WAL file exceeds the
      if (stats.size > this.maxWalSize) {
        // Rename the file into wal.<timestamp>.json
        const timestamp = Date.now();
        const newWalFilePath = path.join(
          walPath,
          `wal.${timestamp}.json`, // Use a timestamp to avoid shifting all files
        );
        fs.renameSync(walFilePath, newWalFilePath);
        console.log(`WAL file rotated: ${walFilePath} -> ${newWalFilePath}`);
      }
    }

    // Append the JSONL representation of the operation to the WAL file
    const operationData = {
      ...operation,
      timestamp: new Date(operation.timestamp).toISOString(),
    };
    const operationLine = `${JSON.stringify(operationData)}\n`;
    fs.appendFileSync(walFilePath, operationLine, 'utf8');

    console.log(`Operation ${operation.oid} appended to WAL`);
    return this;
  }

  // Empty the WAL files by generate new pack files inside .nt/operations
  flushWalToPackFiles(repositorySlug: string): void {
    const repository = this.repositories.get(repositorySlug);
    if (!repository) {
      throw new Error(`Repository ${repositorySlug} not found`);
    }

    // List all files in the WAL directory
    const walPath = path.join(repository.path, '.nt/operations/wal');
    if (!fs.existsSync(walPath)) {
      throw new Error(`WAL directory not found: ${walPath}`);
    }
    const walFiles = fs
      .readdirSync(walPath)
      .filter((file) => file.startsWith('wal.') && file.endsWith('.json'));
    if (walFiles.length === 0) {
      console.log(`No WAL files to flush for repository ${repositorySlug}`);
      return;
    }
    console.log(
      `Flushing ${walFiles.length} WAL files for repository ${repositorySlug}...`,
    );

    // Iterate over each WAL file to generate a new pack file
    walFiles.forEach((walFile) => {
      const walFilePath = path.join(walPath, walFile);
      const packObjects: PackObject[] = [];

      // Read the WAL file line by line
      const lines = fs.readFileSync(walFilePath, 'utf8').split('\n');
      for (const line of lines) {
        if (line.trim()) {
          const operation: Operation = JSON.parse(line);

          // Convert operation to YAML, compress using zlib, and create a string representation in Base64
          const operationData = new ObjectData(operation).toCompressedBase64();

          packObjects.push({
            oid: operation.oid,
            kind: 'operation',
            ctime: operation.timestamp,
            description: `Operation ${operation.name} on object ${operation.oid}`,
            data: operationData,
          });
        }
      }

      // Create a PackFile from the operations
      const packFile: PackFile = {
        oid: generateOid(), // Generate a unique OID for the pack file
        file_mtime: '',
        file_size: 0,
        ctime: new Date().toISOString(),
        objects: packObjects,
        blobs: [], // No blobs in operations for now
      };
      // Write the pack file to disk in `.nt/operations/{oid[0:2]}/{oid}.pack
      const packDir = path.join(
        repository.path,
        '.nt/operations',
        packFile.oid.slice(0, 2),
      );
      if (!fs.existsSync(packDir)) {
        fs.mkdirSync(packDir, { recursive: true });
      }
      const filepath = path.join(packDir, `${packFile.oid}.pack`);
      if (fs.existsSync(filepath)) {
        throw new Error(`Pack file already exists: ${filepath}`);
      }
      // Serialize the pack file to human-readable YAML
      const yamlStr = yaml.dump(packFile, { noRefs: true, skipInvalid: true });
      fs.writeFileSync(filepath, yamlStr, 'utf8');

      console.log(`Pack file created: ${filepath}`);

      // Empty the WAL file after processing if wal.json, otherwise delete it
      if (walFile === 'wal.json') {
        // If it's the main WAL file, we just empty it
        fs.writeFileSync(walFilePath, '', 'utf8');
        console.log(`WAL file emptied: ${walFilePath}`);
      } else {
        // For rotated WAL files, we can delete them
        fs.unlinkSync(walFilePath);
        console.log(`Deleted rotated WAL file: ${walFilePath}`);
      }
    });

    console.log(
      `Flushed ${walFiles.length} WAL files to pack files for repository ${repositorySlug}`,
    );
  }
}
