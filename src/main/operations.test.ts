import yaml from 'js-yaml';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { gunzipSync } from 'zlib';
import OperationsManager, { ObjectData } from './operations';
import { RepositoryRefConfig } from '../shared/Model';

describe('ObjectData', () => {
  const sampleObj = { foo: 'bar', num: 42, arr: [1, 2, 3] };

  it('should store and return the value', () => {
    const obj = new ObjectData(sampleObj);
    expect(obj.value).toEqual(sampleObj);
  });

  it('should compress and decompress correctly', () => {
    const obj = new ObjectData(sampleObj);
    const base64 = obj.toCompressedBase64();

    // decompress manually to check
    const buffer = Buffer.from(base64, 'base64');
    const decompressed = gunzipSync(buffer).toString('utf8');
    const parsed = yaml.load(decompressed);
    expect(parsed).toEqual(sampleObj);
  });

  it('should round-trip with fromCompressedBase64', () => {
    const obj = new ObjectData(sampleObj);
    const base64 = obj.toCompressedBase64();
    const restored = ObjectData.fromCompressedBase64(base64);
    expect(restored.value).toEqual(sampleObj);
  });

  it('should throw on invalid base64', () => {
    expect(() => ObjectData.fromCompressedBase64('notbase64')).toThrow();
  });
});

let tempDir: string;

describe('OperationsManager', () => {
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'notewriter-test-'));
  });

  afterEach(() => {
    // Delete only if exists
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('appends operations and flushes to a pack file', async () => {
    // Setup a fake repository config
    const repository: RepositoryRefConfig = {
      slug: 'test-repo',
      name: 'Test Repository',
      path: tempDir,
      selected: true,
    };

    const manager = await OperationsManager.create();
    manager.registerRepository(repository);

    // Append a few operations
    const ops = [
      {
        oid: '00000000000000000000000000000000000001',
        object_oid: '00000000000000000000000000000000000001',
        name: 'review-flashcard',
        timestamp: new Date().toISOString(),
        extras: { interval: '1d' },
      },
      {
        oid: '00000000000000000000000000000000000002',
        object_oid: '00000000000000000000000000000000000002',
        name: 'add-annotation',
        timestamp: new Date().toISOString(),
        extras: { annotation: 'Rewrite' },
      },
    ];

    ops.forEach((op) => {
      manager.appendOperationToWal(repository.slug, op);
    });

    // Check that the WAL file was filled
    const walPath = path.join(tempDir, '.nt', 'operations', 'wal', 'wal.json');
    expect(fs.existsSync(walPath)).toBe(true);
    let walContent = fs.readFileSync(walPath, 'utf8');
    let walRows = walContent
      .split('\n')
      .filter((line) => line.length > 0).length;
    expect(walRows).toBe(2);

    // Now flush WAL to pack files
    manager.flushWalToPackFiles(repository.slug);

    // Check that a pack file was created
    const packDir = path.join(tempDir, '.nt', 'operations');

    // Find the subdirectory and pack files
    const subdirs = fs.readdirSync(packDir).filter((f) => f.length === 2);
    expect(subdirs.length).toBeGreaterThan(0);
    const packFiles = fs
      .readdirSync(path.join(packDir, subdirs[0]))
      .filter((f) => f.endsWith('.pack'));
    expect(packFiles.length).toBe(1);

    // Read and check the pack file content
    const packFilePath = path.join(packDir, subdirs[0], packFiles[0]);
    const packFileContent = fs.readFileSync(packFilePath, 'utf8');
    const packFile = yaml.load(packFileContent) as any;

    expect(packFile.objects.length).toBe(2);
    expect(packFile.objects[0].kind).toBe('operation');
    expect(packFile.objects[1].kind).toBe('operation');
    expect(packFile.objects[0].data).toBeDefined();
    expect(packFile.objects[1].data).toBeDefined();

    // WAL file must be empty after flushing
    expect(fs.existsSync(walPath)).toBe(true);
    walContent = fs.readFileSync(walPath, 'utf8');
    walRows = walContent.split('\n').filter((line) => line.length > 0).length;
    expect(walRows).toBe(0);
  });

  it('rotates wal files and create as many pack files', async () => {
    // Setup a fake repository config
    const repository: RepositoryRefConfig = {
      slug: 'test-repo',
      name: 'Test Repository',
      path: tempDir,
      selected: true,
    };

    const manager = await OperationsManager.create({ maxWalSize: 1 }); // Force WAL rotation after every append
    manager.registerRepository(repository);

    // Append a few operations
    const ops = [
      {
        oid: '00000000000000000000000000000000000001',
        object_oid: '00000000000000000000000000000000000001',
        name: 'review-flashcard',
        timestamp: new Date().toISOString(),
        extras: { interval: '1d' },
      },
      {
        oid: '00000000000000000000000000000000000002',
        object_oid: '00000000000000000000000000000000000002',
        name: 'add-annotation',
        timestamp: new Date().toISOString(),
        extras: { annotation: 'Rewrite' },
      },
    ];

    ops.forEach((op) => {
      manager.appendOperationToWal(repository.slug, op);
    });

    // Several WAL files must have been created
    const operationsDir = path.join(tempDir, '.nt', 'operations');
    const walDir = path.join(operationsDir, 'wal');
    const walFiles = findFilesWithExtension(walDir, '.json');
    // expect walFiles to contains two files
    expect(walFiles.length).toBe(2);
    const walPath1 = path.join(walDir, walFiles[0]);
    const walPath2 = path.join(walDir, walFiles[1]);
    expect(walPath1).toMatch(/wal\.json$/);
    expect(walPath2).toMatch(/wal\.\d+\.json$/);

    manager.flushWalToPackFiles(repository.slug);

    // Check that two pack files were created
    const packFiles = findFilesWithExtension(operationsDir, '.pack');
    expect(packFiles.length).toBe(2);

    const walFilesAfter = findFilesWithExtension(operationsDir, '.json');
    // Only main WAL file must remained and be empty
    expect(walFilesAfter.length).toBe(1);
    expect(walFilesAfter[0]).toMatch(/wal\.json$/);
  });
});

// Recursively find files with a specific extension in a directory
function findFilesWithExtension(
  dir: string,
  extension: string,
  fileList: string[] = [],
): string[] {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath: string = path.join(dir, file.name);

    if (file.isDirectory()) {
      findFilesWithExtension(fullPath, extension, fileList); // Recursively search subdirectory
    } else if (file.isFile() && fullPath.endsWith(extension)) {
      fileList.push(fullPath);
    }
  }

  return fileList.sort().reverse();
}
