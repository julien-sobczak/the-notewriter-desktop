/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useEffect } from 'react';
import { useImmerReducer } from 'use-immer';
import configReducer from './configReducer';

const { ipcRenderer } = window.electron;

// Useful Resource: https://blog.isquaredsoftware.com/2021/01/context-redux-differences/
// TODO migrate to tsx (see https://dev.to/elisealcala/react-context-with-usereducer-and-typescript-4obm)

const initialState = {
  static: {
    workspaces: [],
  },
  dynamic: {
    desks: [],
  },
};

export const ConfigContext = createContext({
  state: initialState,
  dispatch: (e) => console.log(e),
});

// eslint-disable-next-line react/prop-types
export function ConfigContextProvider({ children }) {
  const [state, dispatch] = useImmerReducer(configReducer, initialState);

  useEffect(() => {
    ipcRenderer.on('configuration-loaded', (arg) => {
      const config = arg;
      dispatch({
        type: 'init',
        payload: config,
      });
    });
    ipcRenderer.on('window-is-closing', () => {
      console.log('window-is-closing');
      ipcRenderer.sendMessage('window-is-closing', state.dynamic);
    });
  }, [state]);

  // TODO Add more user-friendly method to every dispath action
  // See https://dougschallmoser.medium.com/context-api-usereducer-in-react-2691c137f5f

  // eslint-disable-next-line react/jsx-no-constructed-context-values
  const value = { state, dispatch };
  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}
