/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable react/no-unstable-nested-components */
/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useContext } from 'react';
import { DiMarkdown } from 'react-icons/di';
import { FaRegFolder, FaRegFolderOpen } from 'react-icons/fa';
import TreeView, {
  ITreeViewOnNodeSelectProps,
  flattenTree,
} from 'react-accessible-treeview';
import { FilesResult, File } from 'shared/model/Query';
import { Note } from 'shared/model/Note';
import { ConfigContext } from './ConfigContext';
import NotesContainer from './NoteContainer';

const { ipcRenderer } = window.electron;

function Browser() {
  const { config } = useContext(ConfigContext);

  // Read configured workspaces (useful to populate the dropdown)
  const { workspaces } = config.static;

  // Which workspace?
  let defaultWorkspaceSlug;
  if (workspaces.length > 0) defaultWorkspaceSlug = workspaces[0].slug;
  const [selectedWorkspace, setSelectedWorkspace] = useState<
    string | undefined
  >(defaultWorkspaceSlug);

  // Files in selectedWorkspace
  const [files, setFiles] = useState<File[]>([]);
  // Which file?
  const [selectedFile, setSelectedFile] = useState<string | undefined>(
    undefined
  );
  // Notes in selectedFile
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!selectedWorkspace) return;

    // Retrieve all files every time the selected workspace change
    ipcRenderer.sendMessage('list-files', selectedWorkspace);
    ipcRenderer.on('list-files', (arg) => {
      // TODO bug? should be executed only once?
      const result = arg as FilesResult;
      // console.log(files);
      const filteredFiles = result.files.filter(
        (file) => !file.relativePath.startsWith('journal')
      );
      // setFiles(result.files);
      setFiles(filteredFiles);
    });
  }, [selectedWorkspace]);

  useEffect(() => {
    ipcRenderer.on('list-notes-in-file', (arg) => {
      const result = arg as Note[];
      // console.log(results);
      setNotes(result);
    });
  }, []);

  // See https://dgreene1.github.io/react-accessible-treeview/docs/examples-DirectoryTree
  const folder = filesToFolder(files);
  const data = flattenTree(folder);

  // Triggered when a user select a directory or a file in the tree view
  const handleTreeViewSelect = (value: ITreeViewOnNodeSelectProps) => {
    if (value.isBranch) return; // We only search for notes inside files.

    // ids store the relative path
    const selectedRelativePath = `${value.element.id}`;
    if (!selectedRelativePath) return;

    setSelectedFile(selectedRelativePath);

    ipcRenderer.sendMessage(
      'list-notes-in-file',
      selectedWorkspace,
      selectedRelativePath
    );
  };

  if (selectedFile) {
    console.log(`Rendering notes for file ${selectedFile}...`);
  }

  return (
    <div className="Browser">
      {/* The left panel to select a file */}
      <div className="BrowserTree">
        <select
          value={selectedWorkspace}
          onChange={(e) => setSelectedWorkspace(e.target.value)}
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
        <NotesContainer notes={notes} />
      </div>
    </div>
  );
}

export interface TreeNode {
  id: string | number;
  name: string;
  children: TreeNode[];
}

function filesToFolder(files: File[]): any {
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
    <FaRegFolderOpen color="gray" className="icon" />
  ) : (
    <FaRegFolder color="gray" className="icon" />
  );
}

function FileIcon({ filename }: any) {
  const extension = filename.slice(filename.lastIndexOf('.') + 1);
  switch (extension) {
    case 'md':
      return <DiMarkdown color="gray" className="icon" />;
    case 'markdown':
      return <DiMarkdown color="gray" className="icon" />;
    default:
      return null;
  }
}

export default Browser;
