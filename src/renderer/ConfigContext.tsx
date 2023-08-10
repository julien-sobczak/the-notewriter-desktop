/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useEffect } from 'react';
import { useImmerReducer } from 'use-immer';
import { EditorStaticConfig, EditorDynamicConfig } from 'shared/model/Config';
import configReducer from './configReducer';

const { ipcRenderer } = window.electron;

// Useful Resources:
// - https://blog.isquaredsoftware.com/2021/01/context-redux-differences/
// - https://dev.to/elisealcala/react-context-with-usereducer-and-typescript-4obm

type ConfigContextType = {
  static: EditorStaticConfig;
  dynamic: EditorDynamicConfig;
};

const initialState: ConfigContextType = {
  static: {
    workspaces: [],
    inspirations: null,
  },
  dynamic: {
    desks: [],
  },
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
    ipcRenderer.on('configuration-loaded', (arg) => {
      const existingConfig = arg;
      dispatch({
        type: 'init',
        payload: existingConfig,
      });
    });
    ipcRenderer.on('window-is-closing', () => {
      console.log('window-is-closing');
      ipcRenderer.sendMessage('window-is-closing', config.dynamic);
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
