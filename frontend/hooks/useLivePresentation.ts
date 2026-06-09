'use client';

import { useState, useCallback, useRef } from 'react';
import {
  startPresenterSession,
  broadcastSlidePage,
  endPresenterSession,
  useOnPresenterSessionStart,
  useOnSyncSlidePage,
  useOnPresenterSessionEnd,
  type PresenterSessionPayload,
} from '../lib/socket';

export interface ActiveBroadcast {
  presenterId: string;
  presenterName: string;
  groupId: string;
  fileId: string;
  fileName: string;
  startedAt: string;
  /** Latest page number relayed by the presenter */
  currentPage: number;
}

export interface UseLivePresentationReturn {
  /** Current inbound broadcast notification (null = nobody presenting) */
  activeBroadcast: ActiveBroadcast | null;
  /** Whether this peer has opted-in to follow the presenter's viewport */
  isFollowingPresenter: boolean;
  /** Whether THIS user is the active presenter */
  isPresenting: boolean;
  /** Page number to snap to when following */
  followerPage: number;

  /** Begin a live presentation session for a given file */
  startPresenting: (groupId: string, fileId: string, fileName: string) => void;
  /** Broadcast the current page number to all room members */
  broadcastPage: (groupId: string, fileId: string, pageNumber: number) => void;
  /** End your own presenter session cleanly */
  stopPresenting: (groupId: string) => void;

  /** Accept the presenter's invite — snap to their current page */
  followPresenter: () => void;
  /** Dismiss the toast and stay on your own isolated track */
  ignorePresenter: () => void;
  /** Detach from a live session while it's still running */
  leavePresenterFeed: () => void;
}

/**
 * useLivePresentation
 *
 * Manages Feature B — the full live-slide-presentation state machine.
 * Subscribes to socket events from the gateway and exposes a clean API
 * for both presenters and audience members.
 *
 * Security gatekeeper: `isFollowingPresenter` must be explicitly set to `true`
 * by the peer before any viewport snapping occurs. The gateway never forces it.
 */
export const useLivePresentation = (currentUserId?: string): UseLivePresentationReturn => {
  const [activeBroadcast, setActiveBroadcast] = useState<ActiveBroadcast | null>(null);
  const [isFollowingPresenter, setIsFollowingPresenter] = useState(false);
  const [isPresenting, setIsPresenting] = useState(false);
  const [followerPage, setFollowerPage] = useState(1);

  // Guard against processing events from ourselves
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;

  // ── Inbound: another peer started a broadcast ──────────────────────────────
  const handlePresenterSessionStart = useCallback(
    (data: PresenterSessionPayload) => {
      // Ignore our own echo (presenter does not receive their own broadcast via client.to())
      // but as a safety net, filter by ID
      if (data.presenterId === currentUserIdRef.current) return;

      setActiveBroadcast({
        ...data,
        currentPage: 1,
      });
      // Reset any previous follow state for new session
      setIsFollowingPresenter(false);
    },
    [],
  );
  useOnPresenterSessionStart(handlePresenterSessionStart);

  // ── Inbound: presenter changed page ───────────────────────────────────────
  const handleSyncSlidePage = useCallback(
    (data: { presenterId: string; fileId: string; pageNumber: number }) => {
      if (data.presenterId === currentUserIdRef.current) return;

      setActiveBroadcast((prev) =>
        prev && prev.presenterId === data.presenterId
          ? { ...prev, currentPage: data.pageNumber }
          : prev,
      );

      // Only snap the viewport if the user has explicitly opted-in
      setFollowerPage((prev) => {
        // Will be applied by consumer only when isFollowingPresenter === true
        return data.pageNumber;
      });
    },
    [],
  );
  useOnSyncSlidePage(handleSyncSlidePage);

  // ── Inbound: presenter ended the session ──────────────────────────────────
  const handlePresenterSessionEnd = useCallback(
    (data: { presenterId: string }) => {
      if (data.presenterId === currentUserIdRef.current) return;
      setActiveBroadcast(null);
      setIsFollowingPresenter(false);
    },
    [],
  );
  useOnPresenterSessionEnd(handlePresenterSessionEnd);

  // ── Outbound actions ──────────────────────────────────────────────────────

  const startPresenting = useCallback((groupId: string, fileId: string, fileName: string) => {
    setIsPresenting(true);
    startPresenterSession(groupId, fileId, fileName);
  }, []);

  const broadcastPage = useCallback((groupId: string, fileId: string, pageNumber: number) => {
    if (!isPresenting) return;
    broadcastSlidePage(groupId, fileId, pageNumber);
  }, [isPresenting]);

  const stopPresenting = useCallback((groupId: string) => {
    setIsPresenting(false);
    endPresenterSession(groupId);
  }, []);

  const followPresenter = useCallback(() => {
    setIsFollowingPresenter(true);
  }, []);

  const ignorePresenter = useCallback(() => {
    // Dismiss the toast; user stays on their own track
    setActiveBroadcast(null);
    setIsFollowingPresenter(false);
  }, []);

  const leavePresenterFeed = useCallback(() => {
    setIsFollowingPresenter(false);
    // Keep activeBroadcast alive so the toast can be re-accepted if desired
  }, []);

  return {
    activeBroadcast,
    isFollowingPresenter,
    isPresenting,
    followerPage,
    startPresenting,
    broadcastPage,
    stopPresenting,
    followPresenter,
    ignorePresenter,
    leavePresenterFeed,
  };
};
