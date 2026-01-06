import { useEffect, useState, useContext } from 'react'
import { ArrowLeftIcon as BackIcon } from '@phosphor-icons/react'
import { ConfigContext } from '@renderer/ConfigContext'
import { JournalConfigWithContext, RoutineConfig } from '@renderer/Model'
import Question from './Question'
import RenderedRoutine from './RenderedRoutine'
import { Actions, Action } from './Actions'
import Loader from './Loader'

type ViewState = 'loading' | 'journal-selection' | 'routine-selection' | 'routine-execution'

function Hi() {
  const { config } = useContext(ConfigContext)
  const [viewState, setViewState] = useState<ViewState>('loading')
  const [journals, setJournals] = useState<JournalConfigWithContext[]>([])
  const [selectedJournal, setSelectedJournal] = useState<JournalConfigWithContext | null>(null)
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineConfig | null>(null)

  useEffect(() => {
    // Load journal configuration
    const loadJournals = () => {
      const allJournals = selectedJournals(config)
      setJournals(allJournals)

      if (allJournals.length === 0) {
        // No journals configured
        setViewState('loading')
      } else if (allJournals.length === 1) {
        // Only one journal, skip selection
        setSelectedJournal(allJournals[0])
        setViewState('routine-selection')
      } else {
        // Multiple journals, need to select
        setViewState('journal-selection')
      }
    }

    loadJournals()
  }, [config])

  const handleJournalSelected = (journal: JournalConfigWithContext) => {
    setSelectedJournal(journal)
    setViewState('routine-selection')
  }

  const handleRoutineSelected = (routine: RoutineConfig) => {
    setSelectedRoutine(routine)
    setViewState('routine-execution')
  }

  const handleBackToRoutines = () => {
    setSelectedRoutine(null)
    setViewState('routine-selection')
  }

  const handleBackToJournals = () => {
    setSelectedJournal(null)
    setSelectedRoutine(null)
    setViewState('journal-selection')
  }

  if (viewState === 'loading') {
    return (
      <div className="Hi Screen">
        {journals.length === 0 ? (
          <p>
            No journals configured. Please add journal configuration to your editorconfig.yaml file.
          </p>
        ) : (
          <Loader />
        )}
      </div>
    )
  }

  if (viewState === 'journal-selection') {
    return (
      <div className="Hi Screen">
        <Question
          question="Which journal would you like to use?"
          choices={journals}
          renderChoice={(journal) => <span>{journal.name}</span>}
          onChoiceSelected={handleJournalSelected}
        />
      </div>
    )
  }

  if (viewState === 'routine-selection' && selectedJournal) {
    return (
      <div className="Hi Screen">
        {journals.length > 1 && (
          <Actions>
            <Action icon={<BackIcon />} title="Back to Journals" onClick={handleBackToJournals} />
          </Actions>
        )}
        <Question
          question={`Which routine would you like to complete for ${selectedJournal.name}?`}
          choices={selectedJournal.routines}
          renderChoice={(routine) => <span>{routine.name}</span>}
          onChoiceSelected={handleRoutineSelected}
        />
      </div>
    )
  }

  if (viewState === 'routine-execution' && selectedJournal && selectedRoutine) {
    return (
      <div className="Hi Screen">
        <Actions>
          <Action icon={<BackIcon />} title="Back to Routines" onClick={handleBackToRoutines} />
        </Actions>
        <RenderedRoutine
          journal={selectedJournal}
          routine={selectedRoutine}
          onComplete={() => setViewState('journal-selection')}
        />
      </div>
    )
  }

  return (
    <div className="Hi">
      <h1>Hi!</h1>
      <p>Something went wrong. Please try again.</p>
    </div>
  )
}

export default Hi
