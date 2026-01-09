import { FolderOpenIcon } from '@phosphor-icons/react'
import './Welcome.css'

type WelcomeProps = {
  onRepositorySelected: (path: string) => void
}

function Welcome({ onRepositorySelected }: WelcomeProps) {
  const handleBrowse = async () => {
    const result = await window.api.selectDirectory()
    if (result) {
      onRepositorySelected(result)
    }
  }

  return (
    <div className="Welcome">
      <div className="WelcomeContent">
        <h1>Welcome to The NoteWriter</h1>
        <p>Choose a repository to get started</p>
        <button className="WelcomeBrowseButton" onClick={handleBrowse}>
          <FolderOpenIcon size={24} />
          <span>Browse</span>
        </button>
      </div>
    </div>
  )
}

export default Welcome
