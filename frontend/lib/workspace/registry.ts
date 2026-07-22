import React from 'react';
import { WorkspaceStageType, WorkspaceToolType, WorkspaceWidgetType } from './types';

// Tool Components
import { NotesTool } from '../../components/workspace/tools/NotesTool';
import { AITool } from '../../components/workspace/tools/AITool';
import { BrowserTool } from '../../components/workspace/tools/BrowserTool';

// The interface for a Tool component (e.g., Notes, AI, Browser)
export interface ToolComponentProps {
  isActive: boolean;
}

// The interface for a Widget component (e.g., Members, Chat, Voice)
export interface WidgetComponentProps {
  isActive: boolean;
}

// The interface for a Stage component (e.g., Slides, Video, Code)
export interface StageComponentProps {
  assetId: string | null;
  meta?: any;
}

export interface WorkspaceRegistry {
  tools: Partial<Record<WorkspaceToolType, React.ComponentType<ToolComponentProps>>>;
  widgets: Partial<Record<WorkspaceWidgetType, React.ComponentType<WidgetComponentProps>>>;
  stages: Partial<Record<WorkspaceStageType, React.ComponentType<StageComponentProps>>>;
}

// Populate this registry as we build out the components in Phase 2
import { MembersWidget } from '../../components/workspace/widgets/MembersWidget';
import { ChatWidget } from '../../components/workspace/widgets/ChatWidget';

import { SlidesStage } from '../../components/workspace/stages/SlidesStage';
import { WhiteboardStage } from '../../components/workspace/stages/WhiteboardStage';

export const workspaceRegistry: WorkspaceRegistry = {
  tools: {
    notes: NotesTool,
    ai: AITool,
    browser: BrowserTool,
  },
  widgets: {
    members: MembersWidget,
    chat: ChatWidget,
  },
  stages: {
    slides: SlidesStage,
    whiteboard: WhiteboardStage,
  },
};
