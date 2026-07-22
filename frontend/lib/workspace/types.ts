export type WorkspaceMode = 'study' | 'lecture' | 'coding' | 'revision' | 'presentation' | 'brainstorm' | 'project';

export type WorkspaceStageType = 'pdf' | 'slides' | 'whiteboard' | 'code' | 'video' | 'empty';
export type WorkspaceToolType = 'notes' | 'ai' | 'browser' | 'resources' | 'lms' | 'calendar' | 'quiz' | 'flashcards';
export type WorkspaceWidgetType = 'members' | 'voice' | 'chat' | 'queue' | 'activity' | 'timeline' | 'tasks' | 'polls' | 'goals';

export interface SharedState {
  roomId: string;
  mode: WorkspaceMode;
  activeStage: {
    type: WorkspaceStageType;
    assetId: string | null;
    meta?: any; // e.g. current slide number, whiteboard data
  };
  presenterId: string | null;
  // timer, goals, etc.
}

export interface PersonalState {
  activeTool: WorkspaceToolType | null;
  activeWidgets: WorkspaceWidgetType[];
  dockHeight: number;
  toolState: Record<WorkspaceToolType, any>; // local drafts, ai chat history, etc.
}

export interface WorkspaceLayout {
  isNavExpanded: boolean;
  isContextPanelExpanded: boolean;
  isDockExpanded: boolean;
}

export interface WorkspaceState {
  shared: SharedState;
  personal: PersonalState;
  layout: WorkspaceLayout;
}

export interface WorkspaceEngineContext {
  state: WorkspaceState;
  dispatch: (action: any) => void;
  // Utility methods
  openTool: (tool: WorkspaceToolType) => void;
  closeTool: () => void;
  toggleWidget: (widget: WorkspaceWidgetType) => void;
  setMode: (mode: WorkspaceMode) => void;
  setStage: (type: WorkspaceStageType, assetId: string | null, meta?: any) => void;
  socket: any | null;
}
