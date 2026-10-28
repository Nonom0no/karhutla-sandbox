/* eslint-disable react-refresh/only-export-components */
// src/state/context.tsx - React Context provider and custom hooks for AppState and AppDispatch

import React, { createContext, useContext, useReducer, type Dispatch } from "react";
import { appReducer, initialState } from "./reducer";
import type { Action, AppState } from "./types";

const AppStateContext = createContext<AppState | undefined>(undefined);
const AppDispatchContext = createContext<Dispatch<Action> | undefined>(undefined);

export interface AppProviderProps {
  children: React.ReactNode;
  initialStateOverride?: AppState;
}

export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  initialStateOverride,
}) => {
  const [state, dispatch] = useReducer(
    appReducer,
    initialStateOverride ?? initialState
  );

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={dispatch}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

export function useAppState(): AppState {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error("useAppState must be used within an AppProvider");
  }
  return context;
}

export function useAppDispatch(): Dispatch<Action> {
  const context = useContext(AppDispatchContext);
  if (context === undefined) {
    throw new Error("useAppDispatch must be used within an AppProvider");
  }
  return context;
}
