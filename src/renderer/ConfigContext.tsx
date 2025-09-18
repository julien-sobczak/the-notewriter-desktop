/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useEffect } from 'react';
import { useImmerReducer } from 'use-immer';
import {
  EditorStaticConfig,
  EditorDynamicConfig,
  RepositoryConfig,
  RepositoryRefConfig,
} from '../shared/Model';
import configReducer from './configReducer';

// Useful Resources:
// - https://blog.isquaredsoftware.com/2021/01/context-redux-differences/
// - https://dev.to/elisealcala/react-context-with-usereducer-and-typescript-4obm

type ConfigContextType = {
  static: EditorStaticConfig;
  dynamic: EditorDynamicConfig;
  repositories: { [key: string]: RepositoryConfig };
};

const initialState: ConfigContextType = {
  static: {
    repositories: [],
    inspirations: [],
  },
  dynamic: {
    desks: [],
  },
  repositories: {},
};

export const ConfigContext = createContext<{
  config: ConfigContextType;
  dispatch: React.Dispatch<any>;
}>({
  config: initialState,
  dispatch: (e: any) => console.log(e),
});

// eslint-disable-next-line react/prop-types
export function ConfigContextProvider({ children }: any) {
  const [config, dispatch] = useImmerReducer(configReducer, initialState);

  useEffect(() => {
    if (!window.electron) return;
    window.electron.onConfigurationLoaded((existingConfig: any) => {
      console.log('Received [configuration-loaded]');
      dispatch({
        type: 'init',
        payload: existingConfig,
      });
    });
    window.electron.onWindowIsClosing(() => {
      console.log('window-is-closing');
      window.electron.saveDynamicConfig(config.dynamic);
    });
  }, [config]);

  // TODO Add more user-friendly method to every dispath action
  // See https://dougschallmoser.medium.com/context-api-usereducer-in-react-2691c137f5f

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const value = { config, dispatch };
  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

/* Helpers */

// Utility function to get selected repository slugs
export function getSelectedRepositorySlugs(
  staticConfig: EditorStaticConfig,
): string[] {
  return staticConfig.repositories
    .filter((repository: RepositoryRefConfig) => repository.selected)
    .map((repository: RepositoryRefConfig) => repository.slug);
}

// Utility function to determine a short label from an attribute value.
// If a shorthand exists in the repository config, it returns that shorthand.
export function determineShortAttributeLabel(
  repositoryConfig: RepositoryConfig,
  attributeName: string,
  value: string,
): string {
  const shorthand = determineAttributeShorthand(
    repositoryConfig,
    attributeName,
    value,
  );

  if (shorthand) {
    return shorthand;
  }

  // If no shorthand found, return the original value
  return value;
}

// Utility function to determine a long label from an attribute value.
export function determineLongAttributeLabel(
  repositoryConfig: RepositoryConfig,
  attributeName: string,
  value: string,
): string {
  const shorthand = determineAttributeShorthand(
    repositoryConfig,
    attributeName,
    value,
  );

  if (shorthand) {
    return `${shorthand} ${value}`;
  }

  // If no shorthand found, return the original value
  return value;
}

// Utility function to find the shorthand from an attribute value.
export function determineAttributeShorthand(
  repositoryConfig: RepositoryConfig,
  attributeName: string,
  value: string,
): string | undefined {
  const attributeConfig = repositoryConfig?.attributes?.[attributeName];

  if (!attributeConfig || !attributeConfig.shorthands) {
    return undefined;
  }

  // Look for the value in shorthands and return the key if found
  for (const [shorthand, expandedValue] of Object.entries(
    attributeConfig.shorthands,
  )) {
    if (expandedValue === value) {
      return shorthand;
    }
  }

  return undefined;
}
