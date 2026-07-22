import React from 'react';
import { StageComponentProps } from '../../../lib/workspace/registry';

export const WhiteboardStage: React.FC<StageComponentProps> = ({ assetId }) => {
  return (
    <div className="w-full h-full bg-[#121212] border border-fouzar-border flex flex-col items-center justify-center p-8 rounded-xl shadow-2xl relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <h2 className="text-2xl font-bold mb-4 relative z-10 text-white">Whiteboard (Stage)</h2>
      <p className="text-gray-400 relative z-10">
        Canvas ID: {assetId || 'None'}
      </p>
    </div>
  );
};
