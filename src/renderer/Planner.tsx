import { useState, useContext } from 'react';
import { Note, QueryResult, ListItem } from '../shared/Model';
import { ConfigContext, getSelectedRepositorySlugs } from './ConfigContext';
import KanbanBoard from './KanbanBoard';
import RenderedNote from './RenderedNote';
import RenderedListItem from './RenderedListItem';

type PlannerMode = 'question' | 'project' | 'task';

function Planner() {
  const { config } = useContext(ConfigContext);
  const staticConfig = config.static;
  const [mode, setMode] = useState<PlannerMode>('question');
  const [foundNotes, setFoundNotes] = useState<Note[]>([]);
  const [foundItems, setFoundItems] = useState<[Note, ListItem][]>([]);

  const selectedRepositorySlugs = getSelectedRepositorySlugs(staticConfig);

  // Handle finding projects
  const handleFindProject = async () => {
    if (!staticConfig.planner?.projects || !window.electron) return;

    const allNotes: Note[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const projectConfig of staticConfig.planner.projects) {
      // Only query repositories that are both selected and in the project config
      const repositoriesToQuery = projectConfig.repositories.filter((slug) =>
        selectedRepositorySlugs.includes(slug),
      );

      if (repositoriesToQuery.length === 0) continue;

      // eslint-disable-next-line no-await-in-loop
      const results: QueryResult = await window.electron.search({
        q: projectConfig.query,
        repositories: repositoriesToQuery,
        deskId: null,
        blockId: null,
        limit: 0,
        shuffle: false,
      });

      allNotes.push(...results.notes);
    }

    setFoundNotes(allNotes);
    setMode('project');
  };

  // Handle finding tasks
  const handleFindTask = async () => {
    if (!staticConfig.planner?.tasks || !window.electron) return;

    const allItems: [Note, ListItem][] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const taskConfig of staticConfig.planner.tasks) {
      // Only query repositories that are both selected and in the task config
      const repositoriesToQuery = taskConfig.repositories.filter((slug) =>
        selectedRepositorySlugs.includes(slug),
      );

      if (repositoriesToQuery.length === 0) continue;

      // eslint-disable-next-line no-await-in-loop
      const results: QueryResult = await window.electron.search({
        q: taskConfig.query,
        repositories: repositoriesToQuery,
        deskId: null,
        blockId: null,
        limit: 0,
        shuffle: false,
      });

      // Extract all list items from the found notes
      for (const note of results.notes) {
        if (note.items?.children) {
          for (const item of note.items.children) {
            allItems.push([note, item]);
          }
        }
      }
    }

    setFoundItems(allItems);
    setMode('task');
  };

  // Go back to question mode
  const handleGoBack = () => {
    setMode('question');
    setFoundNotes([]);
    setFoundItems([]);
  };

  if (mode === 'question') {
    return (
      <div className="Planner">
        <h1>What to do?</h1>
        <div className="PlannerOptions">
          <button
            type="button"
            className="PlannerButton"
            onClick={handleFindProject}
          >
            Find a project
          </button>
          <button
            type="button"
            className="PlannerButton"
            onClick={handleFindTask}
          >
            Find a task
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'project') {
    return (
      <div className="Planner">
        <div className="PlannerHeader">
          <button type="button" onClick={handleGoBack}>
            ← Back
          </button>
          <h1>Projects</h1>
        </div>
        <KanbanBoard
          columns={[
            {
              title: 'Someday',
              statuses: ['todo', 'planned', 'to-refine', 'on-hold'],
            },
            { title: 'Today', statuses: ['in-progress', 'on-hold', 'blocked'] },
            { title: 'Tomorrow', statuses: ['done', 'archived', 'cancelled'] },
          ]}
          items={foundNotes}
          renderItem={(note: Note) => (
            <RenderedNote note={note} showActions={false} />
          )}
        />
      </div>
    );
  }

  if (mode === 'task') {
    return (
      <div className="Planner">
        <div className="PlannerHeader">
          <button type="button" onClick={handleGoBack}>
            ← Back
          </button>
          <h1>Tasks</h1>
        </div>
        <KanbanBoard
          columns={[
            { title: 'Todo', statuses: ['todo', 'planned', 'to-refine'] },
            {
              title: 'In-Progress',
              statuses: ['in-progress', 'on-hold', 'blocked'],
            },
            { title: 'Done', statuses: ['done', 'archived', 'cancelled'] },
          ]}
          items={foundItems}
          renderItem={([note, item]: [Note, ListItem]) => (
            <RenderedListItem note={note} item={item} />
          )}
        />
      </div>
    );
  }

  return null;
}

export default Planner;
