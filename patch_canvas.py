import os

path = "frontend/components/focus/workspace/SanctuaryCanvas.tsx"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update toolbar tabs array
if "{ id: 'youtube', icon: Play, label: 'YT Search' }" not in content:
    content = content.replace(
        "{ id: 'web', icon: Globe, label: 'Web Hub' },",
        "{ id: 'web', icon: Globe, label: 'Web Hub' },\n            { id: 'youtube', icon: MonitorPlay, label: 'YT Search' },"
    )

# 2. Update select dropdown options
if "<option value=\"youtube\">YT Search</option>" not in content:
    content = content.replace(
        "<option value=\"web\">Web Hub</option>",
        "<option value=\"web\">Web Hub</option>\n              <option value=\"youtube\">YT Search</option>"
    )

# 3. Add MediaHubStandalone to renderTabContent
if "tab === 'youtube'" not in content:
    youtube_code = """    if (tab === 'youtube') {
      return (
        <section className={`flex flex-col overflow-hidden border-fouzar-border flex-1 h-full w-full ${isGreenhouse ? 'fouzar-glass m-2 rounded-[var(--fouzar-radius-lg)]' : ''}`}>
          <div className="flex-1 min-h-[280px] lg:min-h-0 bg-fouzar-surface/40 backdrop-blur-xl border border-fouzar-border rounded-[var(--fouzar-radius-lg)] p-6 flex flex-col overflow-hidden">
            <MediaHubStandalone
              folderId={activeFolderId}
              onVideoSelect={(url, videoId, title) => {
                // Video selected
                setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`);
                setActiveSplitTabs(prev => ({ ...prev, left: 'media' }));
              }}
            />
          </div>
        </section>
      );
    }
    
    return null;"""
    
    content = content.replace("return null;\n  };", youtube_code + "\n  };")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("SanctuaryCanvas updated successfully!")
