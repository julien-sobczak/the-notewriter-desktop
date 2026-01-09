/* eslint-disable react-hooks/exhaustive-deps */
import { useContext, useEffect, useState } from 'react'
import { XIcon as CloseIcon } from '@phosphor-icons/react'
import { QueryConfigWithContext, QueryResult } from '@renderer/Model'
import KanbanBoard, { KanbanItem } from './KanbanBoard'
import Markdown from './Markdown'
import { Action, Actions } from './Actions'
import Question from './Question'
import { ConfigContext, getSelectedRepositorySlugs } from '@renderer/ConfigContext'

type PlannerMode = 'question' | 'project' | 'task'

async function searchItems(repositorySlug: string, query: string): Promise<KanbanItem[]> {
  // Perform search
  const results: QueryResult = await window.api.search({
    query: query,
    repositories: [repositorySlug],
    deskOid: null,
    blockOid: null,
    limit: 0,
    shuffle: false
  })

  const items: KanbanItem[] = []

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
          noteLine: item.line
        })
      }
    } else {
      items.push({
        group: (note.attributes?.project as string) || 'Untitled',
        status: (note.attributes?.status as string) || 'todo',
        description: note.body,
        repositorySlug: note.repositorySlug,
        noteOID: note.oid,
        noteLine: note.line
      })
    }
  }

  return items
}

function Planner() {
  const { config } = useContext(ConfigContext)
  const editorConfig = config.config
  const [mode, setMode] = useState<PlannerMode>('question')
  const [projectItems, setProjectItems] = useState<KanbanItem[]>([])
  const [taskItems, setTaskItems] = useState<KanbanItem[]>([])

  const selectedRepositorySlugs = getSelectedRepositorySlugs(editorConfig)

  // Get project queries from repositories
  const projectQueries: QueryConfigWithContext[] = []
  const taskQueries: QueryConfigWithContext[] = []

  for (const repoSlug of selectedRepositorySlugs) {
    const repoConfig = config.repositories[repoSlug]
    if (repoConfig?.queries) {
      for (const [, queryConfig] of Object.entries(repoConfig.queries)) {
        if (queryConfig.tags?.includes('project')) {
          projectQueries.push({
            title: queryConfig.title,
            query: queryConfig.query,
            repositorySlug: repoSlug
          })
        }
        if (queryConfig.tags?.includes('task')) {
          taskQueries.push({
            title: queryConfig.title,
            query: queryConfig.query,
            repositorySlug: repoSlug
          })
        }
      }
    }
  }

  // Refresh projectItems when staticConfig changes and mode is 'project'
  useEffect(() => {
    if (mode === 'project') {
      handleFindProject()
    }
  }, [staticConfig, mode])

  // Refresh taskItems when staticConfig changes and mode is 'task'
  useEffect(() => {
    if (mode === 'task') {
      handleFindTask()
    }
  }, [staticConfig, mode])

  const handleChoiceSelected = (choice: string) => {
    if (choice === 'Find a project') {
      handleFindProject()
    } else if (choice === 'Find a task') {
      handleFindTask()
    }
  }

  // Handle finding projects
  const handleFindProject = async () => {
    if (!window.electron) return

    const items: KanbanItem[] = []

    for (const projectQuery of projectQueries) {
      const results: KanbanItem[] = await searchItems(
        projectQuery.repositorySlug,
        projectQuery.query
      )
      items.push(...results)
    }

    setProjectItems(items)
    setMode('project')
  }

  // Handle finding tasks
  const handleFindTask = async () => {
    if (!window.electron) return

    const items: KanbanItem[] = []
    for (const taskQuery of taskQueries) {
      const results: KanbanItem[] = await searchItems(taskQuery.repositorySlug, taskQuery.query)
      items.push(...results)
    }

    setTaskItems(items)
    setMode('task')
  }

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
            <Action onClick={() => setMode('question')} title="Back" icon={<CloseIcon />} />
          </Actions>

          {mode === 'project' && (
            <KanbanBoard
              columns={[
                {
                  title: 'Someday',
                  statuses: ['todo', 'planned', 'to-refine']
                },
                {
                  title: 'Today',
                  statuses: ['in-progress', 'on-hold', 'blocked']
                },
                {
                  title: 'Tomorrow',
                  statuses: ['done', 'archived', 'cancelled']
                }
              ]}
              items={projectItems}
              renderItem={(item: KanbanItem) => <Markdown md={item.description} />}
            />
          )}

          {mode === 'task' && (
            <KanbanBoard
              columns={[
                { title: 'Todo', statuses: ['todo', 'planned', 'to-refine'] },
                {
                  title: 'In-Progress',
                  statuses: ['in-progress', 'on-hold', 'blocked']
                },
                { title: 'Done', statuses: ['done', 'archived', 'cancelled'] }
              ]}
              items={taskItems}
              renderItem={(item: KanbanItem) => <Markdown md={item.description} />}
            />
          )}
        </div>
      )}
    </div>
  )
}

export default Planner
