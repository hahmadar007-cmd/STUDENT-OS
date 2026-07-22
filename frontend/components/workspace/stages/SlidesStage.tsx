import React from 'react';
import { StageComponentProps } from '../../../lib/workspace/registry';

export const SlidesStage: React.FC<StageComponentProps> = ({ assetId, meta }) => {
  return (
    <div className="w-full h-full bg-fouzar-surface border border-fouzar-border flex flex-col items-center justify-center p-8 rounded-xl shadow-2xl">
      <h2 className="text-2xl font-bold mb-4">Slides Viewer (Stage)</h2>
      <p className="text-fouzar-text-secondary">
        Asset ID: {assetId || 'None'}
      </p>
      {meta && (
        <p className="text-fouzar-text-tertiary mt-2 font-mono text-sm">
          Slide {meta.currentSlide || 1}
        </p>
      )}
    </div>
  );
};
