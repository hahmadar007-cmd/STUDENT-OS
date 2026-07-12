'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Video, MicOff, VideoOff, PhoneOff, Mic, Camera, Monitor, Hand, Users } from 'lucide-react';

interface LiveLoungeProps {
  groupId: string;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

export function LiveLounge({ groupId }: LiveLoungeProps) {
  const [isCallActive, setIsCallActive]     = useState(false);
  const [isMuted, setIsMuted]               = useState(false);
  const [isCameraOff, setIsCameraOff]       = useState(false);
  const [isHandRaised, setIsHandRaised]     = useState(false);
  const [isSharing, setIsSharing]           = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [isLoading, setIsLoading]           = useState(false);
  const [loadError, setLoadError]           = useState<string | null>(null);

  const apiRef       = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const roomName = `fouzar-study-${groupId.replace(/[^a-zA-Z0-9]/g, '-')}`;

  /* ─── Load Jitsi script once ─── */
  const loadJitsiScript = (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[data-jitsi]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.setAttribute('data-jitsi', 'true');
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Jitsi script'));
      document.head.appendChild(script);
    });

  /* ─── Start call ─── */
  const startCall = async () => {
    setIsLoading(true);
    setLoadError(null);
    setIsCallActive(true);

    try {
      await loadJitsiScript();

      // Small tick to let React mount the container div
      await new Promise((r) => setTimeout(r, 80));

      if (!containerRef.current) {
        setLoadError('Container not ready. Please try again.');
        setIsCallActive(false);
        setIsLoading(false);
        return;
      }

      apiRef.current = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        parentNode: containerRef.current,
        width:  '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted:   false,
          startWithVideoMuted:   false,
          disableDeepLinking:    true,
          prejoinPageEnabled:    false,
          disableInviteFunctions: true,
          toolbarButtons: [],
          hideConferenceSubject: true,
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS:              [],
          SHOW_JITSI_WATERMARK:         false,
          SHOW_WATERMARK_FOR_GUESTS:    false,
          SHOW_POWERED_BY:              false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          HIDE_INVITE_MORE_HEADER:      true,
          filmStripOnly:                false,
        },
        userInfo: { displayName: 'Study Peer' },
      });

      /* ── Bind real events ── */
      apiRef.current.on('audioMuteStatusChanged', ({ muted }: { muted: boolean }) => {
        setIsMuted(muted);
      });
      apiRef.current.on('videoMuteStatusChanged', ({ muted }: { muted: boolean }) => {
        setIsCameraOff(muted);
      });
      apiRef.current.on('screenSharingStatusChanged', ({ on }: { on: boolean }) => {
        setIsSharing(on);
      });
      apiRef.current.on('raiseHandUpdated', ({ handRaised }: { handRaised: boolean }) => {
        setIsHandRaised(handRaised);
      });
      apiRef.current.on('participantJoined', () => {
        setParticipantCount(apiRef.current?.getNumberOfParticipants?.() ?? participantCount + 1);
      });
      apiRef.current.on('participantLeft', () => {
        setParticipantCount((p) => Math.max(1, p - 1));
      });
      apiRef.current.on('videoConferenceLeft', () => {
        handleLeave();
      });

      setIsLoading(false);
    } catch (err: any) {
      console.error('Jitsi load error', err);
      setLoadError('Could not connect to Live Lounge. Check your internet and try again.');
      setIsCallActive(false);
      setIsLoading(false);
    }
  };

  /* ─── Controls ─── */
  const handleMute          = () => apiRef.current?.executeCommand('toggleAudio');
  const handleCamera        = () => apiRef.current?.executeCommand('toggleVideo');
  const handleRaiseHand     = () => apiRef.current?.executeCommand('toggleRaiseHand');
  const handleScreenShare   = () => apiRef.current?.executeCommand('toggleShareScreen');

  const handleLeave = () => {
    try { apiRef.current?.dispose(); } catch { /* already gone */ }
    apiRef.current = null;
    setIsCallActive(false);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsHandRaised(false);
    setIsSharing(false);
    setParticipantCount(1);
  };

  /* Cleanup on unmount */
  useEffect(() => () => { try { apiRef.current?.dispose(); } catch { /* noop */ } }, []);

  /* ═══════════════ LOBBY ═══════════════ */
  if (!isCallActive) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full w-full p-8">
        <div className="relative w-full max-w-lg">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-fouzar-accent/20 via-transparent to-fouzar-accent-ice/10 blur-xl pointer-events-none" />
          <div className="relative border border-fouzar-border/60 bg-fouzar-surface/60 backdrop-blur-md rounded-2xl p-10 flex flex-col items-center gap-6 shadow-2xl">
            
            <div className="w-16 h-16 rounded-2xl bg-fouzar-accent/10 border border-fouzar-accent/30 flex items-center justify-center shadow-[0_0_24px_rgba(124,92,252,0.2)]">
              <Video className="w-8 h-8 text-fouzar-accent" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="font-sans text-lg font-medium text-fouzar-text-primary tracking-wide">
                Live Lounge
              </h2>
              <p className="text-xs font-sans text-fouzar-text-secondary uppercase tracking-widest">
                Group · {groupId}
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 w-full">
              <div className="flex items-center gap-2 text-xs font-sans text-fouzar-text-tertiary uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Powered by Jitsi Meet · End-to-end encrypted
              </div>
              <p className="text-[10px] font-mono text-fouzar-text-tertiary/70 text-center">
                Mute, camera, screen share & raise hand — all controlled from below
              </p>
            </div>

            {loadError && (
              <p className="text-[11px] font-mono text-red-400 text-center bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {loadError}
              </p>
            )}

            <button
              type="button"
              onClick={startCall}
              disabled={isLoading}
              className="flex items-center gap-2.5 px-7 py-3 bg-fouzar-accent hover:opacity-90 disabled:opacity-60 text-fouzar-text-primary font-sans text-sm font-medium uppercase tracking-wider rounded-full shadow-[0_0_20px_rgba(124,92,252,0.35)] hover:shadow-[0_0_32px_rgba(124,92,252,0.5)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <span className="text-base">🎙️</span>
                  Enter Live Lounge
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════ CALL VIEW ═══════════════ */
  return (
    <div className="flex-1 flex flex-col h-full w-full relative overflow-hidden">

      {/* Participant count badge */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-fouzar-surface/80 backdrop-blur-md border border-fouzar-border/50 rounded-full text-[10px] font-mono text-fouzar-text-secondary">
        <Users className="w-3 h-3 text-fouzar-accent" />
        <span>{participantCount} in room</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse ml-1" />
      </div>

      {/* Jitsi iframe container */}
      <div
        ref={containerRef}
        className="flex-1 w-full rounded-[6px] overflow-hidden bg-fouzar-bg"
        style={{ minHeight: '400px' }}
      />

      {/* ── Custom Control Bar ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2.5 bg-fouzar-surface/85 backdrop-blur-xl border border-fouzar-border/50 rounded-full shadow-2xl">

        {/* Mute */}
        <button
          type="button"
          onClick={handleMute}
          title={isMuted ? 'Unmute' : 'Mute'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            isMuted
              ? 'bg-red-500/20 border border-red-500/40 text-red-400'
              : 'bg-fouzar-surface/60 border border-fouzar-border/40 text-fouzar-text-secondary hover:text-fouzar-text-primary hover:border-fouzar-border'
          }`}
        >
          {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          {isMuted ? 'Unmute' : 'Mute'}
        </button>

        {/* Camera */}
        <button
          type="button"
          onClick={handleCamera}
          title={isCameraOff ? 'Camera On' : 'Camera Off'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            isCameraOff
              ? 'bg-red-500/20 border border-red-500/40 text-red-400'
              : 'bg-fouzar-surface/60 border border-fouzar-border/40 text-fouzar-text-secondary hover:text-fouzar-text-primary hover:border-fouzar-border'
          }`}
        >
          {isCameraOff ? <VideoOff className="w-3 h-3" /> : <Camera className="w-3 h-3" />}
          {isCameraOff ? 'Cam On' : 'Cam Off'}
        </button>

        {/* Screen Share */}
        <button
          type="button"
          onClick={handleScreenShare}
          title={isSharing ? 'Stop Sharing' : 'Share Screen'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            isSharing
              ? 'bg-fouzar-accent/20 border border-fouzar-accent/40 text-fouzar-accent'
              : 'bg-fouzar-surface/60 border border-fouzar-border/40 text-fouzar-text-secondary hover:text-fouzar-text-primary hover:border-fouzar-border'
          }`}
        >
          <Monitor className="w-3 h-3" />
          {isSharing ? 'Stop Share' : 'Share'}
        </button>

        {/* Raise Hand */}
        <button
          type="button"
          onClick={handleRaiseHand}
          title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
            isHandRaised
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400'
              : 'bg-fouzar-surface/60 border border-fouzar-border/40 text-fouzar-text-secondary hover:text-fouzar-text-primary hover:border-fouzar-border'
          }`}
        >
          <Hand className="w-3 h-3" />
          {isHandRaised ? 'Lower' : 'Hand'}
        </button>

        <div className="w-[1px] h-4 bg-fouzar-border/40 mx-1" />

        {/* Leave */}
        <button
          type="button"
          onClick={handleLeave}
          title="Leave call"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 text-[8px] font-mono uppercase tracking-wider transition-all cursor-pointer"
        >
          <PhoneOff className="w-3 h-3" />
          Leave
        </button>
      </div>
    </div>
  );
}
