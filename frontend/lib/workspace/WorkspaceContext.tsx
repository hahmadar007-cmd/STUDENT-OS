'use client';

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  WorkspaceState,
  WorkspaceMode,
  WorkspaceStageType,
  WorkspaceToolType,
  WorkspaceWidgetType,
  WorkspaceEngineContext,
} from './types';

const initialState: WorkspaceState = {
  shared: {
    roomId: '',
    mode: 'study',
    activeStage: {
      type: 'empty',
      assetId: null,
    },
    presenterId: null,
  },
  personal: {
    activeTool: null,
    activeWidgets: ['members', 'chat'], // default widgets
    dockHeight: 400,
    toolState: {} as any,
  },
  layout: {
    isNavExpanded: false,
    isContextPanelExpanded: true,
    isDockExpanded: false,
  },
};

type Action =
  | { type: 'SET_MODE'; payload: WorkspaceMode }
  | { type: 'SET_STAGE'; payload: { type: WorkspaceStageType; assetId: string | null; meta?: any } }
  | { type: 'OPEN_TOOL'; payload: WorkspaceToolType }
  | { type: 'CLOSE_TOOL' }
  | { type: 'TOGGLE_WIDGET'; payload: WorkspaceWidgetType }
  | { type: 'SET_SHARED_STATE'; payload: Partial<WorkspaceState['shared']> };

function workspaceReducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'SET_MODE':
      return {
        ...state,
        shared: { ...state.shared, mode: action.payload },
      };
    case 'SET_STAGE':
      return {
        ...state,
        shared: { ...state.shared, activeStage: action.payload },
      };
    case 'OPEN_TOOL':
      return {
        ...state,
        personal: { ...state.personal, activeTool: action.payload },
        layout: { ...state.layout, isDockExpanded: true },
      };
    case 'CLOSE_TOOL':
      return {
        ...state,
        personal: { ...state.personal, activeTool: null },
        layout: { ...state.layout, isDockExpanded: false },
      };
    case 'TOGGLE_WIDGET':
      const widgets = state.personal.activeWidgets;
      const newWidgets = widgets.includes(action.payload)
        ? widgets.filter((w) => w !== action.payload)
        : [...widgets, action.payload];
      return {
        ...state,
        personal: { ...state.personal, activeWidgets: newWidgets },
        layout: { ...state.layout, isContextPanelExpanded: newWidgets.length > 0 },
      };
    case 'SET_SHARED_STATE':
      return {
        ...state,
        shared: { ...state.shared, ...action.payload },
      };
    default:
      return state;
  }
}

const Context = createContext<WorkspaceEngineContext | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode; initialRoomId: string }> = ({
  children,
  initialRoomId,
}) => {
  const [state, dispatch] = useReducer(workspaceReducer, {
    ...initialState,
    shared: { ...initialState.shared, roomId: initialRoomId },
  });

  const socketRef = useRef<Socket | null>(null);

  // Initialize socket and listeners if not local
  useEffect(() => {
    if (initialRoomId === 'sanctuary-local') return;

    const token = localStorage.getItem('fouzar_token');
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
      auth: { token },
      query: { token },
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinGroup', { groupId: initialRoomId });
    });

    socket.on('onWorkspaceStateSync', (data: { sharedState: Partial<WorkspaceState['shared']> }) => {
      dispatch({ type: 'SET_SHARED_STATE', payload: data.sharedState });
    });

    return () => {
      socket.disconnect();
    };
  }, [initialRoomId]);

  // Sync state to peers whenever we update shared state locally
  const broadcastSync = (updatedSharedState: Partial<WorkspaceState['shared']>) => {
    if (initialRoomId !== 'sanctuary-local' && socketRef.current?.connected) {
      socketRef.current.emit('workspace-state-sync', {
        groupId: initialRoomId,
        sharedState: updatedSharedState,
      });
    }
  };

  const openTool = (tool: WorkspaceToolType) => dispatch({ type: 'OPEN_TOOL', payload: tool });
  const closeTool = () => dispatch({ type: 'CLOSE_TOOL' });
  const toggleWidget = (widget: WorkspaceWidgetType) => dispatch({ type: 'TOGGLE_WIDGET', payload: widget });
  
  const setMode = (mode: WorkspaceMode) => {
    dispatch({ type: 'SET_MODE', payload: mode });
    broadcastSync({ mode });
  };
  
  const setStage = (type: WorkspaceStageType, assetId: string | null, meta?: any) => {
    const payload = { type, assetId, meta };
    dispatch({ type: 'SET_STAGE', payload });
    broadcastSync({ activeStage: payload });
  };

  return (
    <Context.Provider value={{ state, dispatch, openTool, closeTool, toggleWidget, setMode, setStage, socket: socketRef.current }}>
      {children}
    </Context.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(Context);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
