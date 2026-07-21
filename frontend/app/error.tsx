'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('GLOBAL ERROR BOUNDARY CAUGHT:', error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-[#0d0d14] text-white p-4">
      <div className="max-w-2xl bg-red-500/10 border border-red-500/30 p-8 rounded-2xl flex flex-col items-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">A fatal client error occurred</h2>
        <div className="w-full bg-black/50 p-4 rounded-lg overflow-x-auto text-left mb-6">
          <p className="font-mono text-sm text-red-400 mb-2 font-bold">{error.name}: {error.message}</p>
          <pre className="font-mono text-[10px] text-red-300/70 whitespace-pre-wrap break-words">
            {error.stack}
          </pre>
        </div>
        <button
          onClick={() => reset()}
          className="px-6 py-2 bg-white/10 hover:bg-white/20 transition-colors rounded-lg text-sm font-medium"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
