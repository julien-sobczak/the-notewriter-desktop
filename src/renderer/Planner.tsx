/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useContext, useEffect } from 'react';
import { X as CloseIcon } from '@phosphor-icons/react';
import { QueryResult } from '../shared/Model';
import { ConfigContext, getSelectedRepositorySlugs } from './ConfigContext';
import KanbanBoard, { KanbanItem } from './KanbanBoard';
import Markdown from './Markdown';
import { Action, Actions } from './Actions';
import Question from './Question';

type PlannerMode = 'question' | 'project' | 'task';

async function searchItems(
  repositorySlugs: string[],
  query: string,
): Promise<KanbanItem[]> {
  // Perform search
  const results: QueryResult = await window.electron.search({
    q: query,
    repositories: repositorySlugs,
    deskId: null,
    blockId: null,
    limit: 0,
    shuffle: false,
  });

  const items: KanbanItem[] = [];

  for (const note of results.notes) {
    // Projects can be described using dedicated notes (ex: "@title:Synopsis) or in a list of items (ex: "- Project A")
    if (note.items?.children) {
      for (const item of note.items.children) {
        items.push({
          group: (note.attributes?.project as string) || 'Untitled',
          status: (item.attributes?.status as string) || 'todo',
          description: item.text,
          repositorySlug: note.repositorySlug,
          noteOID: note.oid,
          noteLine: item.line,
        });
      }
    } else {
      items.push({
        group: (note.attributes?.project as string) || 'Untitled',
        status: (note.attributes?.status as string) || 'todo',
        description: note.body,
        repositorySlug: note.repositorySlug,
        noteOID: note.oid,
        noteLine: note.line,
      });
    }
  }

  return items;
}

function Planner() {
  const { config } = useContext(ConfigContext);
  const staticConfig = config.static;
  const [mode, setMode] = useState<PlannerMode>('question');
  const [projectItems, setProjectItems] = useState<KanbanItem[]>([]);
  const [taskItems, setTaskItems] = useState<KanbanItem[]>([]);

  const selectedRepositorySlugs = getSelectedRepositorySlugs(staticConfig);

  // Refresh projectItems when staticConfig changes and mode is 'project'
  useEffect(() => {
    if (mode === 'project') {
      handleFindProject();
    }
  }, [staticConfig, mode]);

  // Refresh taskItems when staticConfig changes and mode is 'task'
  useEffect(() => {
    if (mode === 'task') {
      handleFindTask();
    }
  }, [staticConfig, mode]);

  const handleChoiceSelected = (choice: string) => {
    if (choice === 'Find a project') {
      handleFindProject();
    } else if (choice === 'Find a task') {
      handleFindTask();
    }
  };

  // Handle finding projects
  const handleFindProject = async () => {
    if (!staticConfig.planner?.projects || !window.electron) return;

    const items: KanbanItem[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const projectConfig of staticConfig.planner.projects) {
      // Only query repositories that are both selected and in the project config
      const repositoriesToQuery = projectConfig.repositories.filter((slug) =>
        selectedRepositorySlugs.includes(slug),
      );

      if (repositoriesToQuery.length === 0) continue;

      // eslint-disable-next-line no-await-in-loop
      const results: KanbanItem[] = await searchItems(
        repositoriesToQuery,
        projectConfig.query,
      );
      items.push(...results);
    }

    setProjectItems(items);
    setMode('project');
  };

  // Handle finding tasks
  const handleFindTask = async () => {
    if (!staticConfig.planner?.tasks || !window.electron) return;

    const items: KanbanItem[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const taskConfig of staticConfig.planner.tasks) {
      // Only query repositories that are both selected and in the task config
      const repositoriesToQuery = taskConfig.repositories.filter((slug) =>
        selectedRepositorySlugs.includes(slug),
      );

      if (repositoriesToQuery.length === 0) continue;

      // eslint-disable-next-line no-await-in-loop
      const results: KanbanItem[] = await searchItems(
        repositoriesToQuery,
        taskConfig.query,
      );
      items.push(...results);
    }

    setTaskItems(items);
    setMode('task');
  };

  return (
    <div className="Screen Planner">
      {mode === 'question' && (
        <div className="Content">
          <Question
            question="What to do?"
            choices={['Find a project', 'Find a task']}
            renderChoice={(choice: string) => choice}
            onChoiceSelected={handleChoiceSelected}
          />
        </div>
      )}

      {mode !== 'question' && (
        <div>
          <Actions>
            <Action
              onClick={() => setMode('question')}
              title="Back"
              icon={<CloseIcon />}
            />
          </Actions>

          {mode === 'project' && (
            <KanbanBoard
              columns={[
                {
                  title: 'Someday',
                  statuses: ['todo', 'planned', 'to-refine'],
                },
                {
                  title: 'Today',
                  statuses: ['in-progress', 'on-hold', 'blocked'],
                },
                {
                  title: 'Tomorrow',
                  statuses: ['done', 'archived', 'cancelled'],
                },
              ]}
              items={projectItems}
              renderItem={(item: KanbanItem) => (
                <Markdown md={item.description} />
              )}
            />
          )}

          {mode === 'task' && (
            <KanbanBoard
              columns={[
                { title: 'Todo', statuses: ['todo', 'planned', 'to-refine'] },
                {
                  title: 'In-Progress',
                  statuses: ['in-progress', 'on-hold', 'blocked'],
                },
                { title: 'Done', statuses: ['done', 'archived', 'cancelled'] },
              ]}
              items={taskItems}
              renderItem={(item: KanbanItem) => (
                <Markdown md={item.description} />
              )}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default Planner;
