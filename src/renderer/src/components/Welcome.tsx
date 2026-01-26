import { FolderOpenIcon } from '@phosphor-icons/react'
import { RepositoryRefConfig } from '@renderer/Model'

type WelcomeProps = {
  onRepositorySelected: (ref: RepositoryRefConfig) => void
}

function Welcome({ onRepositorySelected }: WelcomeProps) {
  const handleBrowse = async () => {
    const result = await window.api.browseRepository()
    if (result) {
      onRepositorySelected(result)
    }
  }

  return (
    <div className="Welcome">
      <p>Choose a repository to get started</p>
      <button onClick={handleBrowse}>
        <FolderOpenIcon size={24} />
      </button>
    </div>
  )
}

export default Welcome
