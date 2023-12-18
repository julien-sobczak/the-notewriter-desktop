/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext } from 'react';
import { Folder, FolderOpen, FileText } from '@phosphor-icons/react';
import TreeView, {
  ITreeViewOnNodeSelectProps,
  flattenTree,
} from 'react-accessible-treeview';
import { File, Note, WorkspaceConfig } from 'shared/Model';
import { ConfigContext } from './ConfigContext';
import NoteContainer from './NoteContainer';

const { ipcRenderer } = window.electron;

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

  // Read configured workspaces (useful to populate the dropdown)
  const { workspaces } = config.static;

  // Currently selected workspace
  const [selectedWorkspace, setSelectedWorkspace] = useState<
    string | undefined
  >(getDefaultWorkspaceSlug(file, workspaces));

  // Files in selectedWorkspace
  const [files, setFiles] = useState<File[]>([]);
  // Which file?
  const [selectedFile, setSelectedFile] = useState<string | undefined>(
    file ? file.relativePath : undefined
  );
  const [selectedDir, setSelectedDir] = useState<string | undefined>(
    file ? dirname(file.relativePath) : undefined
  );

  // Notes in selectedFile
  const [notes, setNotes] = useState<Note[]>([]);

  // Refresh when props are updated (ex: cmd+k)
  useEffect(() => {
    if (!file) return;
    setSelectedWorkspace(file.workspaceSlug);
    setSelectedFile(file.relativePath);
    setSelectedDir(dirname(file.relativePath));
  }, [file]);

  // Load files when switching to a new workspace
  useEffect(() => {
    if (!selectedWorkspace) return;
    setFiles([]);
    ipcRenderer.sendMessage('list-files', selectedWorkspace);
  }, [selectedWorkspace]);
  // + listen for answers
  useEffect(() => {
    ipcRenderer.on('list-files', (arg) => {
      const result = arg as File[];
      // console.log(result);
      // TODO keep filtering journal files to force the use f the Journal viewer?
      const filteredFiles = result.filter(
        (foundFile) => !foundFile.relativePath.startsWith('journal')
      );
      setFiles(filteredFiles);
    });
  }, []);

  // Load notes when selecting a file
  useEffect(() => {
    if (!selectedFile) return;

    setNotes([]);
    ipcRenderer.sendMessage(
      'list-notes-in-file',
      selectedWorkspace,
      selectedFile
    );
  }, [selectedFile]);
  // + Listen for answers
  useEffect(() => {
    ipcRenderer.on('list-notes-in-file', (arg) => {
      const result = arg as Note[];
      setNotes(result);
    });
  }, []);

  const handleWorkspaceChange = (workspaceSlug: string) => {
    setSelectedFile(undefined);
    setSelectedDir(undefined);
    setSelectedWorkspace(workspaceSlug);
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

  console.log('<Browser>', selectedWorkspace, selectedDir, selectedFile); // FIXME remove

  return (
    <div className="Browser">
      {/* The left panel to select a file */}
      <div className="LeftPanel">
        <select
          value={selectedWorkspace}
          onChange={(e) => handleWorkspaceChange(e.target.value)}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.slug} value={workspace.slug}>
              {workspace.name}
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

// Return the default workspace to use.
function getDefaultWorkspaceSlug(
  file: File | undefined,
  workspaces: WorkspaceConfig[]
): string | undefined {
  if (file) {
    return file.workspaceSlug;
  }
  if (workspaces.length > 0) {
    return workspaces[0].slug;
  }
  return undefined;
}

export default Browser;
