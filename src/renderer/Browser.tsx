/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext } from 'react';
import { Folder, FolderOpen, FileText } from '@phosphor-icons/react';
import TreeView, {
  ITreeViewOnNodeSelectProps,
  flattenTree,
} from 'react-accessible-treeview';
import { File, Note, RepositoryRefConfig } from '../shared/Model';
import { ConfigContext } from './ConfigContext';
import NoteContainer from './NoteContainer';

function dirname(path: string): string {
  const matches = path.match(/(.*)[/\\]/);
  if (matches) {
    return matches[1];
  }
  return '';
}

type BrowserProps = {
  file?: File;
};

function Browser({ file }: BrowserProps) {
  /*
   * TODO fix a bug in TreeView rendering when switching to a new file from cmd+K.
   * The menu seems to expand with the right node selected and then collapses immediately.
   */

  const { config } = useContext(ConfigContext);

  // Read configured repositories (useful to populate the dropdown)
  const { repositories } = config.static;

  // Currently selected repositories
  const [selectedRepository, setSelectedRepository] = useState<
    string | undefined
  >(getDefaultRepositorySlug(file, repositories));

  // Files in selected repository
  const [files, setFiles] = useState<File[]>([]);
  // Which file?
  const [selectedFile, setSelectedFile] = useState<string | undefined>(
    file ? file.relativePath : undefined,
  );
  const [selectedDir, setSelectedDir] = useState<string | undefined>(
    file ? dirname(file.relativePath) : undefined,
  );

  // Notes in selectedFile
  const [notes, setNotes] = useState<Note[]>([]);

  // Refresh when props are updated (ex: cmd+k)
  useEffect(() => {
    if (!file) return;
    setSelectedRepository(file.repositorySlug);
    setSelectedFile(file.relativePath);
    setSelectedDir(dirname(file.relativePath));
  }, [file]);

  // Load files when switching to a new repository
  useEffect(() => {
    setFiles([]);

    if (!selectedRepository) return;

    const loadFiles = async () => {
      const result: File[] =
        await window.electron.listFiles(selectedRepository);
      // console.log(result);
      // TODO keep filtering journal files to force the use f the Journal viewer?
      const filteredFiles = result.filter(
        (foundFile) => !foundFile.relativePath.startsWith('journal'),
      );
      setFiles(filteredFiles);
    };
    loadFiles();
  }, [selectedRepository]);

  // Load notes when selecting a file
  useEffect(() => {
    if (!selectedRepository) return;
    if (!selectedFile) return;

    setNotes([]);

    const listNotesInFile = async () => {
      const result: Note[] = await window.electron.listNotesInFile(
        selectedRepository,
        selectedFile,
      );
      setNotes(result);
    };
    listNotesInFile();
  }, [selectedFile]);

  const handleRepositoryChange = (repositorySlug: string) => {
    setSelectedFile(undefined);
    setSelectedDir(undefined);
    setSelectedRepository(repositorySlug);
  };

  // Build the tree representation.
  // Check https://dgreene1.github.io/react-accessible-treeview/docs/examples-DirectoryTree
  const folder = filesToFolder(files);
  const data = flattenTree(folder);

  // Triggered when a user select a directory or a file in the tree view
  const handleTreeViewSelect = (value: ITreeViewOnNodeSelectProps) => {
    if (value.isBranch) return; // We only search for notes inside files.

    // ids store the relative path
    const selectedRelativePath = `${value.element.id}`;
    if (!selectedRelativePath) return;

    setSelectedFile(selectedRelativePath);
    setSelectedDir(dirname(selectedRelativePath));
  };

  return (
    <div className="Browser">
      {/* The left panel to select a file */}
      <div className="LeftPanel">
        <select
          value={selectedRepository}
          onChange={(e) => handleRepositoryChange(e.target.value)}
        >
          {repositories.map((repository) => (
            <option key={repository.slug} value={repository.slug}>
              {repository.name}
            </option>
          ))}
        </select>

        {files.length > 0 && (
          <div className="directory">
            <TreeView
              data={data}
              aria-label="directory tree"
              // NB: We use relativePath as ids in TreeView which makes easy to
              // reference nodes in the tree without having to find a random id
              selectedIds={selectedFile ? [selectedFile] : []}
              expandedIds={selectedDir ? [selectedDir] : []}
              onNodeSelect={handleTreeViewSelect}
              nodeRenderer={({
                element,
                isBranch,
                isExpanded,
                getNodeProps,
                level,
              }) => (
                <div
                  {...getNodeProps()}
                  style={{ paddingLeft: 20 * (level - 1) }}
                >
                  {isBranch ? (
                    <FolderIcon isOpen={isExpanded} />
                  ) : (
                    <FileIcon filename={element.name} />
                  )}

                  {element.name}
                </div>
              )}
            />
          </div>
        )}
      </div>

      {/* The main panel to list notes */}
      <div className="BrowserEditor">
        <NoteContainer notes={notes} />
      </div>
    </div>
  );
}

export interface TreeNode {
  id: string | number;
  name: string;
  children: TreeNode[];
  metadata: Record<string, string>;
}

function filesToFolder(files: File[]): TreeNode {
  // Example of expected structure */
  /*
  const folder = {
    name: '',
    children: [
      {
        name: 'src',
        children: [{ name: 'index.js' }, { name: 'styles.css' }],
      },
      {
        name: 'node_modules',
        children: [
          {
            name: 'react-accessible-treeview',
            children: [{ name: 'index.js' }],
          },
          { name: 'react', children: [{ name: 'index.js' }] },
        ],
      },
      {
        name: '.npmignore',
      },
      {
        name: 'package.json',
      },
      {
        name: 'webpack.config.js',
      },
    ],
  };
  */

  const folder: TreeNode = {
    name: '.',
    id: '.',
    children: [],
    metadata: { relativePath: '' },
  };

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const parts = file.relativePath.split('/');
    let node = folder;
    for (let j = 0; j < parts.length; j++) {
      const part = parts[j];
      let found = false;
      for (const child of node.children) {
        if (child.name === part) {
          node = child;
          found = true;
          break;
        }
      }
      if (!found) {
        const relativePath = parts.slice(0, j + 1).join('/');
        const newNode: TreeNode = {
          id: relativePath,
          name: part,
          children: [],
          metadata: { relativePath },
        };
        node.children.push(newNode);
        node = newNode;
      }
    }
  }

  return folder;
}

function FolderIcon({ isOpen }: any) {
  return isOpen ? (
    <FolderOpen color="gray" className="icon" />
  ) : (
    <Folder color="gray" className="icon" />
  );
}

function FileIcon({ filename }: any) {
  const extension = filename.slice(filename.lastIndexOf('.') + 1);
  switch (extension) {
    case 'md':
      return <FileText color="gray" className="icon" />;
    case 'markdown':
      return <FileText color="gray" className="icon" />;
    default:
      return null;
  }
}

// Return the default repository to use.
function getDefaultRepositorySlug(
  file: File | undefined,
  repositories: RepositoryRefConfig[],
): string | undefined {
  if (file) {
    return file.repositorySlug;
  }
  if (repositories.length > 0) {
    return repositories[0].slug;
  }
  return undefined;
}

export default Browser;
