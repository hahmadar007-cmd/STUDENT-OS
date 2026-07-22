import React from 'react';
import { ToolComponentProps } from '../../../lib/workspace/registry';
import { useFouzar } from '../../../lib/FouzarContext';
import { IntegratedAiChat } from '../../ai/IntegratedAiChat';

export const AITool: React.FC<ToolComponentProps> = ({ isActive }) => {
  const { user: fouzarUser, activeFolderId, folders, openDocs } = useFouzar();
  
  const activeFolder = folders.find(f => f.id === activeFolderId);
  const aiStorageKey = fouzarUser?.id 
    ? `fouzar-sanctuary-ai-${fouzarUser.id}` 
    : `fouzar-sanctuary-ai-guest`;

  const contextLabel = openDocs.length > 0 
    ? `${openDocs.length} Docs Open` 
    : activeFolder?.name || 'Sanctuary';

  return (
    <div className={`w-full h-full flex flex-col ${isActive ? 'opacity-100' : 'opacity-50 pointer-events-none'} transition-opacity duration-300`}>
      <IntegratedAiChat contextLabel={contextLabel} storageKey={aiStorageKey} />
    </div>
  );
};
