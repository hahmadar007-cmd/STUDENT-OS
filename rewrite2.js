const fs = require('fs');
let code = fs.readFileSync('frontend/components/focus/workspace/SanctuaryCanvas.tsx', 'utf-8');

if (!code.includes('MediaHubStandalone')) {
    code = code.replace(
        `import { PresenterToast } from '../../groups/PresenterToast';`,
        `import { PresenterToast } from '../../groups/PresenterToast';\nimport { MediaHubStandalone } from '../../sanctuary/MediaHubStandalone';`
    );
}

const oldMediaSection = `              <div className="flex-1 bg-black/50 relative">
                <iframe
                  src={embedUrl}
                  title="Fouzar lecture sandbox"
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {!isFlowActive && (
                <form onSubmit={handleSetVideo} className="p-3 border-t border-fouzar-border flex gap-2 bg-fouzar-surface">
                  <input
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                    placeholder="Paste YouTube lecture URL..."
                    className="flex-1 bg-fouzar-elevated border border-fouzar-border px-3 py-1.5 text-[10px] font-mono rounded-[var(--fouzar-radius-md)] focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-fouzar-accent/10 border border-fouzar-accent/30 text-fouzar-accent font-mono text-[8px] uppercase rounded-[var(--fouzar-radius-md)]"
                  >
                    Load
                  </button>
                </form>
              )}`;

const newMediaSection = `              <div className="flex-1 flex flex-col min-h-0 bg-transparent overflow-hidden">
                <MediaHubStandalone 
                  folderId={activeFolderId}
                  onVideoSelect={(url, videoId, title) => {
                    setEmbedUrl(\`https://www.youtube.com/embed/\${videoId}?autoplay=1&rel=0&modestbranding=1&enablejsapi=1\`);
                  }}
                />
              </div>`;

code = code.replace(oldMediaSection, newMediaSection);

fs.writeFileSync('frontend/components/focus/workspace/SanctuaryCanvas.tsx', code, 'utf-8');
console.log('SanctuaryCanvas refactored.');
