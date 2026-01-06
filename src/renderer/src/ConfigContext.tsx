/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useEffect } from 'react'
import { useImmerReducer } from 'use-immer'
import {
  EditorStaticConfig,
  EditorDynamicConfig,
  RepositoryConfig,
  RepositoryRefConfig
} from '@renderer/Model'
import configReducer from './configReducer'

// Useful Resources:
// - https://blog.isquaredsoftware.com/2021/01/context-redux-differences/
// - https://dev.to/elisealcala/react-context-with-usereducer-and-typescript-4obm

type ConfigContextType = {
  static: EditorStaticConfig
  dynamic: EditorDynamicConfig
  repositories: { [key: string]: RepositoryConfig }
}

const initialState: ConfigContextType = {
  static: {
    repositories: []
  },
  dynamic: {
    desks: []
  },
  repositories: {}
}

export const ConfigContext = createContext<{
  config: ConfigContextType
  dispatch: React.Dispatch<any>
}>({
  config: initialState,
  dispatch: (e: any) => console.log(e)
})

export function ConfigContextProvider({ children }: any) {
  const [config, dispatch] = useImmerReducer(configReducer, initialState)

  useEffect(() => {
    if (!window.electron) return
    window.api.onConfigurationLoaded((existingConfig: any) => {
      console.log('Received [configuration-loaded]')
      dispatch({
        type: 'init',
        payload: existingConfig
      })
    })
    window.api.onWindowIsClosing(() => {
      console.log('window-is-closing')
      window.api.saveDynamicConfig(config.dynamic)
    })
  }, [])

  // TODO Add more user-friendly method to every dispath action
  // See https://dougschallmoser.medium.com/context-api-usereducer-in-react-2691c137f5f

  const value = { config, dispatch }
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

/* Helpers */

// Utility function to get selected repository slugs
export function getSelectedRepositorySlugs(staticConfig: EditorStaticConfig): string[] {
  return staticConfig.repositories
    .filter((repository: RepositoryRefConfig) => repository.selected)
    .map((repository: RepositoryRefConfig) => repository.slug)
}

// Utility function to determine a short label from an attribute value.
// If a shorthand exists in the repository config, it returns that shorthand.
export function determineShortAttributeLabel(
  repositoryConfig: RepositoryConfig,
  attributeName: string,
  value: string
): string {
  const shorthand = determineAttributeShorthand(repositoryConfig, attributeName, value)

  if (shorthand) {
    return shorthand
  }

  // If no shorthand found, return the original value
  return value
}

// Utility function to determine a long label from an attribute value.
export function determineLongAttributeLabel(
  repositoryConfig: RepositoryConfig,
  attributeName: string,
  value: string
): string {
  const shorthand = determineAttributeShorthand(repositoryConfig, attributeName, value)

  if (shorthand) {
    return `${shorthand} ${value}`
  }

  // If no shorthand found, return the original value
  return value
}

// Utility function to find the shorthand from an attribute value.
export function determineAttributeShorthand(
  repositoryConfig: RepositoryConfig,
  attributeName: string,
  value: string
): string | undefined {
  const attributeConfig = repositoryConfig?.attributes?.[attributeName]

  if (!attributeConfig || !attributeConfig.shorthands) {
    return undefined
  }

  // Look for the value in shorthands and return the key if found
  for (const [shorthand, expandedValue] of Object.entries(attributeConfig.shorthands)) {
    if (expandedValue === value) {
      return shorthand
    }
  }

  return undefined
}

// Helper functions to access configuration from selected repositories

export function selectedRepositories(config: ConfigContextType): RepositoryRefConfig[] {
  return config.static.repositories.filter((repo) => repo.selected)
}

export function selectedStats(config: ConfigContextType) {
  const stats: any[] = []
  const repos = selectedRepositories(config)

  for (const repo of repos) {
    const repoConfig = config.repositories[repo.slug]
    if (repoConfig?.stats) {
      stats.push(...repoConfig.stats.map((stat) => ({ ...stat, repositorySlug: repo.slug })))
    }
  }

  return stats
}

export function selectedJournals(config: ConfigContextType) {
  const journals: any[] = []
  const repos = selectedRepositories(config)

  for (const repo of repos) {
    const repoConfig = config.repositories[repo.slug]
    if (repoConfig?.journals) {
      journals.push(
        ...repoConfig.journals.map((journal) => ({ ...journal, repositorySlug: repo.slug }))
      )
    }
  }

  return journals
}

export function selectedDesks(config: ConfigContextType) {
  const desks: any[] = []

  // Add dynamic desks
  if (config.dynamic.desks) {
    desks.push(...config.dynamic.desks.map((desk) => ({ ...desk, repositorySlug: '' })))
  }

  // Add desks from selected repositories
  const repos = selectedRepositories(config)
  for (const repo of repos) {
    const repoConfig = config.repositories[repo.slug]
    if (repoConfig?.desks) {
      desks.push(...repoConfig.desks.map((desk) => ({ ...desk, repositorySlug: repo.slug })))
    }
  }

  return desks
}

export function selectedQueriesMatchingTag(config: ConfigContextType, tag: string) {
  const queries: any[] = []
  const repos = selectedRepositories(config)

  for (const repo of repos) {
    const repoConfig = config.repositories[repo.slug]
    if (repoConfig?.queries) {
      for (const [, queryConfig] of Object.entries(repoConfig.queries)) {
        if (queryConfig.tags && queryConfig.tags.includes(tag)) {
          queries.push({ ...queryConfig, repositorySlug: repo.slug })
        }
      }
    }
  }

  return queries
}

export function selectedInspirations(config: ConfigContextType) {
  return selectedQueriesMatchingTag(config, 'inspiration')
}
