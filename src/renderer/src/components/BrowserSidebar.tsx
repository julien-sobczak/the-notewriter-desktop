import { useState, useEffect, useContext } from 'react'
import {
  XIcon as CloseIcon,
  FolderIcon as FolderCloseIcon,
  FolderOpenIcon,
  FileTextIcon
} from '@phosphor-icons/react'
import TreeView, { ITreeViewOnNodeSelectProps, flattenTree } from 'react-accessible-treeview'
import { File, FileRef } from '@renderer/Model'
import { ConfigContext, getSelectedRepositorySlugs } from '@renderer/ConfigContext'
import { Action, Actions } from './Actions'

type BrowserSidebarProps = {
  onFileSelected?: (file: FileRef) => void
  onClose?: () => void
}

function BrowserSidebar({ onFileSelected, onClose }: BrowserSidebarProps) {
  const { config } = useContext(ConfigContext)

  // Read configured repositories (useful to populate the dropdown)
  const staticConfig = config.static

  // Files in selected repositories
  // Convert to a map of repositorySlug -> files
  const [files, setFiles] = useState<Map<string, File[]>>(new Map())

  // Load files when switching to a new repository
  useEffect(() => {
    const repositorySlugs = getSelectedRepositorySlugs(staticConfig)

    if (!repositorySlugs) return

    const loadFiles = async (repositorySlug: string) => {
      const result: File[] = await window.api.listFiles(repositorySlug)
      setFiles((prev) => new Map(prev).set(repositorySlug, result))
    }
    // Call loadFiles for all selected repositories
    repositorySlugs.forEach(loadFiles)
  }, [staticConfig])

  // Build the tree representation.
  // Check https://dgreene1.github.io/react-accessible-treeview/docs/examples-DirectoryTree
  const folder = filesToFolder(files)
  const data = flattenTree(folder)

  // Triggered when a user select a directory or a file in the tree view
  const handleTreeViewSelect = (value: ITreeViewOnNodeSelectProps) => {
    if (value.isBranch) return // We only search for notes inside files.

    // ids store the repository slug + relative path (`ex: @repoSlug/path/to/file.md[oid]`)
    const selectedMetadata = value.element.metadata
    if (!selectedMetadata) return
    const selectedRepositorySlug = selectedMetadata.repositorySlug
    const selectedRelativePath = selectedMetadata.relativePath
    const selectedOid = selectedMetadata.oid
    if (!selectedRepositorySlug || typeof selectedRepositorySlug !== 'string') return
    if (!selectedRelativePath || typeof selectedRelativePath !== 'string') return
    if (!selectedOid || typeof selectedOid !== 'string') return

    if (onFileSelected) {
      const fileRef: FileRef = {
        repositorySlug: selectedRepositorySlug,
        oid: selectedOid,
        relativePath: selectedRelativePath
      }
      onFileSelected(fileRef)
    }
  }

  return (
    <div className="BrowserSidecar">
      <Actions>
        <Action icon={<CloseIcon />} onClick={onClose} />
      </Actions>

      {files.size > 0 && (
        <div className="directory">
          <TreeView
            data={data}
            aria-label="directory tree"
            // Tip: You can use relativePath as ids in TreeView which makes easy to
            // reference nodes in the tree without having to find a random id
            selectedIds={[]}
            expandedIds={[]}
            onNodeSelect={handleTreeViewSelect}
            nodeRenderer={({ element, isBranch, isExpanded, getNodeProps, level }) => (
              <div {...getNodeProps()} style={{ paddingLeft: 20 * (level - 1) }}>
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
  )
}

export interface TreeNode {
  id: string | number
  name: string
  children: TreeNode[]
  metadata: Record<string, string>
}

function filesToFolder(files: Map<string, File[]>): TreeNode {
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
    metadata: { repositorySlug: '', relativePath: '', oid: '' }
  }

  // Iterate over repositories
  files.forEach((repoFiles, repositorySlug) => {
    const folderRepo: TreeNode = {
      name: repositorySlug,
      id: `@${repositorySlug}`,
      children: [],
      metadata: { repositorySlug: repositorySlug, relativePath: '.', oid: '' }
    }
    folder.children.push(folderRepo)

    // Iterate over files in the repository
    for (let i = 0; i < repoFiles.length; i++) {
      const file = repoFiles[i]
      const parts = file.relativePath.split('/')
      let node = folderRepo
      for (let j = 0; j < parts.length; j++) {
        const part = parts[j]
        let found = false
        for (const child of node.children) {
          if (child.name === part) {
            node = child
            found = true
            break
          }
        }
        if (!found) {
          const relativePath = parts.slice(0, j + 1).join('/')
          const newNode: TreeNode = {
            id: `@${repositorySlug}/${relativePath}`,
            name: part,
            children: [],
            metadata: { repositorySlug, relativePath, oid: file.oid }
          }
          node.children.push(newNode)
          node = newNode
        }
      }
    }
  })

  return folder
}

function FolderIcon({ isOpen }: any) {
  return isOpen ? (
    <FolderOpenIcon color="gray" className="icon" />
  ) : (
    <FolderCloseIcon color="gray" className="icon" />
  )
}

function FileIcon({ filename }: any) {
  const extension = filename.slice(filename.lastIndexOf('.') + 1)
  switch (extension) {
    case 'md':
      return <FileTextIcon color="gray" className="icon" />
    case 'markdown':
      return <FileTextIcon color="gray" className="icon" />
    default:
      return null
  }
}

export default BrowserSidebar
