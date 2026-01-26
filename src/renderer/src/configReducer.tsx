import {
  EditorConfig,
  RepositoryConfig,
  Desk,
  Bookmark,
  TabRef,
  RepositoryRefConfig
} from '@renderer/Model'

export type Config = {
  config: EditorConfig
  repositories: { [key: string]: RepositoryConfig }
}

export type Action = {
  type: string
  payload: any
}

export default function configReducer(draft: Config, action: Action): any {
  console.log('dispatch', action)
  switch (action.type) {
    case 'init': {
      draft.config = action.payload.config
      draft.repositories = action.payload.repositories
      break
    }
    case 'add-repository': {
      const repositoryRefConfig = action.payload as RepositoryRefConfig
      if (!draft.config.repositories) draft.config.repositories = []
      draft.config.repositories.push(repositoryRefConfig)
      break
    }
    case 'remove-repository': {
      const repositoryRefConfig = action.payload as RepositoryRefConfig
      const repositorySlug = repositoryRefConfig.slug
      if (!draft.config.repositories) draft.config.repositories = []
      draft.config.repositories = draft.config.repositories.filter(
        (r: RepositoryRefConfig) => r.slug !== repositorySlug
      )
      delete draft.repositories[repositorySlug]
      console.log(`Removed repository ${repositorySlug}`)
      break
    }
    case 'toggle-repository': {
      for (const repository of draft.config.repositories) {
        if (repository.slug === action.payload) {
          repository.selected = !repository.selected
        }
      }
      break
    }
    case 'add-desk': {
      if (!draft.config.desks) draft.config.desks = []
      draft.config.desks.push(action.payload as Desk)
      break
    }
    case 'edit-desk': {
      if (!draft.config.desks) draft.config.desks = []
      const index = draft.config.desks.findIndex((d: Desk) => d.oid === action.payload.oid)
      draft.config.desks[index] = action.payload
      break
    }
    case 'delete-desk': {
      if (!draft.config.desks) draft.config.desks = []
      draft.config.desks = draft.config.desks.filter((d: Desk) => d.oid !== action.payload.oid)
      break
    }
    case 'add-bookmark': {
      if (!draft.config.bookmarks) draft.config.bookmarks = []
      draft.config.bookmarks.push(action.payload as Bookmark)
      break
    }
    case 'updateTabs': {
      draft.config.tabs = action.payload as TabRef[]
      break
    }
    default: {
      throw Error(`Unknown action: ${action.type}`)
    }
  }
  return draft
}
