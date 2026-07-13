import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { FascaLogoMark } from './SplashScreen';
import { getActiveSession, abortSession } from '../lib/api';
import { getToken, clearToken } from '../lib/storage';
import { connectFocusSocket } from '../lib/socket';
import { NativeModules } from 'react-native';

const { FascaBlocker } = NativeModules;

type SessionStatus = 'FOCUSING' | 'ON_BREAK' | 'IDLE';

interface Session {
  id: string;
  status: SessionStatus;
  startTime: string;
  totalDurationMs: number;
  numberOfBreaks: number;
  breakDurationMs: number;
  currentBreak: number;
  breakEndsAt?: string;
}

interface Props {
  onLogout: () => void;
  onGoToBlocklist: () => void;
  onGoToSetup: (session: Session | null) => void;
}

function useCountdown(endMs: number | null) {
  const [rem, setRem] = useState(0);
  useEffect(() => {
    if (!endMs) return;
    const tick = () => setRem(Math.max(0, endMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endMs]);
  return rem;
}

function fmtMs(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function DashboardScreen({ onLogout, onGoToBlocklist, onGoToSetup }: Props) {
  const [session, setSession]     = useState<Session | null>(null);
  const [loading, setLoading]     = useState(true);
  const [aborting, setAborting]   = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const sessionEndMs  = session ? new Date(session.startTime).getTime() + session.totalDurationMs : null;
  const breakEndsMs   = session?.breakEndsAt ? new Date(session.breakEndsAt).getTime() : null;
  const sessionRem    = useCountdown(sessionEndMs);
  const breakRem      = useCountdown(breakEndsMs);

  // Fetch active session
  useEffect(() => {
    const load = async () => {
      try {
        const s = await getActiveSession();
        setSession(s);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Socket sync
  useEffect(() => {
    const cleanup = connectFocusSocket({
      onFocusStarted: (data) => setSession(prev => prev ? { ...prev, status: 'FOCUSING', ...data } : data),
      onBreakStarted: (data) => setSession(prev => prev ? { ...prev, status: 'ON_BREAK', breakEndsAt: data.breakEndsAt } : null),
      onFocusResumed: () => setSession(prev => prev ? { ...prev, status: 'FOCUSING', breakEndsAt: undefined } : null),
      onFocusEnded: () => {
        setSession(null);
        if (FascaBlocker) FascaBlocker.stopBlockerService();
      },
    });
    return cleanup;
  }, []);

  // Pulsing lock icon during FOCUSING
  useEffect(() => {
    if (session?.status !== 'FOCUSING') return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 800, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [session?.status]);

  const handleAbort = () => {
    Alert.alert('Abort Session', 'Are you sure? This will end your focus session on ALL devices.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Abort', style: 'destructive',
        onPress: async () => {
          setAborting(true);
          await abortSession();
          if (FascaBlocker) FascaBlocker.stopBlockerService();
          setSession(null);
          setAborting(false);
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await clearToken(); onLogout(); } },
    ]);
  };

  // ─── Status colours ────────────────────────────────────────────────────────
  const isFocusing = session?.status === 'FOCUSING';
  const isBreak    = session?.status === 'ON_BREAK';
  const statusColor = isFocusing ? '#7c3aed' : isBreak ? '#059669' : '#334155';
  const statusLabel = isFocusing ? '🔒 FOCUS MODE' : isBreak ? '☕ BREAK TIME' : 'SHIELD IDLE';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#060611" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <FascaLogoMark size={36} />
          <View>
            <Text style={styles.headerTitle}>FASCA</Text>
            <Text style={styles.headerSub}>Focus Companion</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Status Card */}
        <View style={[styles.statusCard, { borderColor: `${statusColor}60` }]}>
          <View style={styles.statusTop}>
            <Animated.Text style={[styles.statusIcon, { transform: [{ scale: isFocusing ? pulseAnim : 1 }] }]}>
              {isFocusing ? '🔒' : isBreak ? '☕' : '🌙'}
            </Animated.Text>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
              <Text style={styles.statusSub}>
                {isFocusing && `Break ${session!.currentBreak}/${session!.numberOfBreaks} used`}
                {isBreak && 'All locks lifted — enjoy your break!'}
                {!session && 'No active session'}
              </Text>
            </View>
          </View>

          {loading && <ActivityIndicator color="#7c3aed" style={{ marginVertical: 8 }} />}

          {/* Countdown */}
          {session && (
            <View style={styles.countdownBlock}>
              {isBreak ? (
                <>
                  <Text style={[styles.countdownLabel, { color: '#34d399' }]}>BREAK ENDS IN</Text>
                  <Text style={[styles.countdown, { color: '#34d399' }]}>{fmtMs(breakRem)}</Text>
                  <Text style={styles.countdownHint}>Locks re-engage automatically when timer hits 0</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.countdownLabel, { color: '#a78bfa' }]}>SESSION ENDS IN</Text>
                  <Text style={[styles.countdown, { color: '#a78bfa' }]}>{fmtMs(sessionRem)}</Text>
                  {session.numberOfBreaks > 0 && (
                    <Text style={styles.countdownHint}>{session.numberOfBreaks - session.currentBreak} break{session.numberOfBreaks - session.currentBreak !== 1 ? 's' : ''} remaining</Text>
                  )}
                </>
              )}
            </View>
          )}

          {/* Abort */}
          {session && (
            <TouchableOpacity style={styles.abortBtn} onPress={handleAbort} disabled={aborting}>
              {aborting ? <ActivityIndicator color="#f87171" size="small" /> : <Text style={styles.abortText}>⏹ ABORT SESSION</Text>}
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        {!session && (
          <TouchableOpacity style={styles.startBtn} onPress={() => onGoToSetup(null)} activeOpacity={0.85}>
            <Text style={styles.startBtnText}>▶ INITIATE FOCUS SESSION</Text>
          </TouchableOpacity>
        )}

        {/* Quick Action Grid */}
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridCard} onPress={onGoToBlocklist} activeOpacity={0.8}>
            <Text style={styles.gridIcon}>🚫</Text>
            <Text style={styles.gridLabel}>Blocklist</Text>
            <Text style={styles.gridSub}>Manage blocked apps & sites</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridCard} onPress={() => onGoToSetup(session)} activeOpacity={0.8}>
            <Text style={styles.gridIcon}>⏱</Text>
            <Text style={styles.gridLabel}>Session</Text>
            <Text style={styles.gridSub}>Configure & start focus</Text>
          </TouchableOpacity>
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerTitle}>📱 App Locker Active</Text>
          <Text style={styles.infoBannerText}>
            Fasca is monitoring for blocked apps. During a focus session, any blocked app will be intercepted with the Fasca lock screen.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060611' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,58,237,0.15)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '800', letterSpacing: 4 },
  headerSub: { color: '#475569', fontSize: 10, letterSpacing: 2 },
  logoutBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  logoutText: { color: '#475569', fontSize: 9, letterSpacing: 2 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  statusCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  statusTop: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { fontSize: 36 },
  statusLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 3 },
  statusSub: { color: '#475569', fontSize: 11, marginTop: 3, letterSpacing: 0.5 },
  countdownBlock: { alignItems: 'center', paddingVertical: 8, gap: 4 },
  countdownLabel: { fontSize: 9, letterSpacing: 3, fontWeight: '600' },
  countdown: { fontSize: 48, fontWeight: '900', letterSpacing: -2, fontVariant: ['tabular-nums'] as any },
  countdownHint: { color: '#475569', fontSize: 10, letterSpacing: 1, textAlign: 'center' },
  abortBtn: {
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.05)',
  },
  abortText: { color: '#f87171', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  startBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  startBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 3 },
  grid: { flexDirection: 'row', gap: 12 },
  gridCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 18,
    gap: 6,
  },
  gridIcon: { fontSize: 24 },
  gridLabel: { color: '#e2e8f0', fontSize: 13, fontWeight: '700' },
  gridSub: { color: '#475569', fontSize: 10, lineHeight: 14 },
  infoBanner: {
    backgroundColor: 'rgba(124,58,237,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  infoBannerTitle: { color: '#a78bfa', fontSize: 13, fontWeight: '700' },
  infoBannerText: { color: '#64748b', fontSize: 11, lineHeight: 17 },
});
