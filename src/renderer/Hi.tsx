import { useEffect, useState, useContext } from 'react';
import { ConfigContext } from './ConfigContext';
import { JournalConfig, RoutineConfig } from '../shared/Model';
import Question from './Question';
import RenderedRoutine from './RenderedRoutine';

type ViewState =
  | 'loading'
  | 'journal-selection'
  | 'routine-selection'
  | 'routine-execution';

function Hi() {
  const { config } = useContext(ConfigContext);
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [journals, setJournals] = useState<JournalConfig[]>([]);
  const [selectedJournal, setSelectedJournal] = useState<JournalConfig | null>(
    null,
  );
  const [selectedRoutine, setSelectedRoutine] = useState<RoutineConfig | null>(
    null,
  );

  useEffect(() => {
    // Load journal configuration
    const loadJournals = () => {
      if (!config?.static?.journal) {
        setJournals([]);
        setViewState('loading');
        return;
      }

      const journalConfigs = config.static.journal;
      setJournals(journalConfigs);

      if (journalConfigs.length === 0) {
        // No journals configured
        setViewState('loading');
      } else if (journalConfigs.length === 1) {
        // Only one journal, skip selection
        setSelectedJournal(journalConfigs[0]);
        setViewState('routine-selection');
      } else {
        // Multiple journals, need to select
        setViewState('journal-selection');
      }
    };

    loadJournals();
  }, [config]);

  const handleJournalSelected = (journal: JournalConfig) => {
    setSelectedJournal(journal);
    setViewState('routine-selection');
  };

  const handleRoutineSelected = (routine: RoutineConfig) => {
    setSelectedRoutine(routine);
    setViewState('routine-execution');
  };

  const handleBackToRoutines = () => {
    setSelectedRoutine(null);
    setViewState('routine-selection');
  };

  const handleBackToJournals = () => {
    setSelectedJournal(null);
    setSelectedRoutine(null);
    setViewState('journal-selection');
  };

  if (viewState === 'loading') {
    return (
      <div className="Hi">
        <h1>Hi!</h1>
        {journals.length === 0 ? (
          <p>
            No journals configured. Please add journal configuration to your
            editorconfig.yaml file.
          </p>
        ) : (
          <p>Loading journals...</p>
        )}
      </div>
    );
  }

  if (viewState === 'journal-selection') {
    return (
      <div className="Hi">
        <Question<JournalConfig>
          question="Which journal would you like to use?"
          choices={journals}
          renderChoice={(journal) => <span>{journal.name}</span>}
          onChoiceSelected={handleJournalSelected}
        />
      </div>
    );
  }

  if (viewState === 'routine-selection' && selectedJournal) {
    return (
      <div className="Hi">
        {journals.length > 1 && (
          <button
            type="button"
            onClick={handleBackToJournals}
            style={{ marginBottom: '20px' }}
          >
            ← Back to Journals
          </button>
        )}
        <Question<RoutineConfig>
          question={`Which routine would you like to complete for ${selectedJournal.name}?`}
          choices={selectedJournal.routines}
          renderChoice={(routine) => <span>{routine.name}</span>}
          onChoiceSelected={handleRoutineSelected}
        />
      </div>
    );
  }

  if (viewState === 'routine-execution' && selectedJournal && selectedRoutine) {
    return (
      <div className="Hi">
        <button
          type="button"
          onClick={handleBackToRoutines}
          style={{ marginBottom: '20px' }}
        >
          ← Back to Routines
        </button>
        <RenderedRoutine journal={selectedJournal} routine={selectedRoutine} />
      </div>
    );
  }

  return (
    <div className="Hi">
      <h1>Hi!</h1>
      <p>Something went wrong. Please try again.</p>
    </div>
  );
}

export default Hi;
