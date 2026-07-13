import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

const QUOTES = [
  '"Focus is the art of knowing what to ignore."',
  '"Where focus goes, energy flows."',
  '"The successful warrior has laser-like focus."',
  '"Discipline is choosing between what you want now and what you want most."',
  '"Do the hard stuff first."',
];

interface Props {
  blockedAppName: string;
  sessionEndTime: number; // ms timestamp
  onUnlock?: () => void; // only available during breaks
  isBreakTime?: boolean;
}

function useCountdown(endMs: number) {
  const [rem, setRem] = React.useState(0);
  useEffect(() => {
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

export const FascaLogoMark: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="fGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#a78bfa" />
        <Stop offset="100%" stopColor="#4f46e5" />
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="100" height="100" rx="22" ry="22" fill="#0f0a1e" />
    <Path d="M22 18 H72 V32 H38 V46 H65 V60 H38 V82 H22 Z" fill="url(#fGrad)" />
    <Path d="M38 46 H68 V60 H38 Z" fill="url(#fGrad)" />
  </Svg>
);

export default function LockScreen({ blockedAppName, sessionEndTime, onUnlock, isBreakTime }: Props) {
  const rem       = useCountdown(sessionEndTime);
  const lockAnim  = useRef(new Animated.Value(1)).current;
  const quote     = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  // Pulse lock icon
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(lockAnim, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(lockAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#060611" />

      {/* Ambient glow */}
      <View style={styles.glow} />

      {/* Logo */}
      <View style={styles.logoRow}>
        <FascaLogoMark size={40} />
        <Text style={styles.wordmark}>FASCA</Text>
      </View>

      {/* Lock icon */}
      <Animated.Text style={[styles.lockIcon, { transform: [{ scale: lockAnim }] }]}>
        🔒
      </Animated.Text>

      {/* Blocked title */}
      <Text style={styles.blockedTitle}>Access Blocked</Text>
      <Text style={styles.blockedApp}>{blockedAppName}</Text>

      {/* Reason */}
      <Text style={styles.reason}>
        This app is on your blocklist and you are currently in a focus session.
      </Text>

      {/* Timer */}
      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>SESSION ENDS IN</Text>
        <Text style={styles.timer}>{fmtMs(rem)}</Text>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Quote */}
      <Text style={styles.quote}>{quote}</Text>

      {/* Back hint */}
      <Text style={styles.hint}>Press ← back to return to your work.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060611',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  glow: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#7c3aed',
    opacity: 0.08,
    top: '20%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  wordmark: {
    color: '#a78bfa',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 6,
  },
  lockIcon: {
    fontSize: 64,
    marginVertical: 8,
  },
  blockedTitle: {
    color: '#e2e8f0',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  blockedApp: {
    color: '#7c3aed',
    fontSize: 13,
    fontFamily: 'monospace',
    backgroundColor: 'rgba(124,58,237,0.1)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    overflow: 'hidden',
  },
  reason: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  timerCard: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.3)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  timerLabel: {
    color: '#7c3aed',
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: '600',
  },
  timer: {
    color: '#a78bfa',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'] as any,
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: 'rgba(124,58,237,0.3)',
  },
  quote: {
    color: '#334155',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 18,
  },
  hint: {
    color: '#1e293b',
    fontSize: 11,
    marginTop: 4,
    letterSpacing: 0.5,
  },
});
