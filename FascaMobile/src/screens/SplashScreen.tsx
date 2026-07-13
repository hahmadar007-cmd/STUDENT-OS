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

// ─── Fasca "F" SVG Logo ────────────────────────────────────────────────────────

export const FascaLogoMark: React.FC<{ size?: number }> = ({ size = 80 }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Defs>
      <LinearGradient id="fGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <Stop offset="0%" stopColor="#a78bfa" />
        <Stop offset="100%" stopColor="#4f46e5" />
      </LinearGradient>
    </Defs>
    {/* Background square with rounded corners */}
    <Rect x="0" y="0" width="100" height="100" rx="22" ry="22" fill="#0f0a1e" />
    {/* Stylised F path */}
    <Path
      d="M22 18 H72 V32 H38 V46 H65 V60 H38 V82 H22 Z"
      fill="url(#fGrad)"
    />
    <Path
      d="M38 46 H68 V60 H38 Z"
      fill="url(#fGrad)"
    />
  </Svg>
);

// ─── Splash Screen ─────────────────────────────────────────────────────────────

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const logoScale  = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const glowAnim   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Logo appears
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      // Text fades in
      Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      // Glow pulses
      Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      // Hold
      Animated.delay(800),
    ]).start(() => onFinish());
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#060611" />

      {/* Ambient glow circle */}
      <Animated.View
        style={[
          styles.glow,
          {
            opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }],
          },
        ]}
      />

      {/* Logo mark */}
      <Animated.View
        style={{
          transform: [{ scale: logoScale }],
          opacity: logoOpacity,
          alignItems: 'center',
        }}
      >
        <FascaLogoMark size={110} />
      </Animated.View>

      {/* Wordmark */}
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center', marginTop: 24 }}>
        <Text style={styles.wordmark}>FASCA</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>YOUR DIGITAL SANCTUARY</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#060611',
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#7c3aed',
    opacity: 0,
  },
  wordmark: {
    color: '#e2e8f0',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 14,
    textTransform: 'uppercase',
  },
  divider: {
    width: 48,
    height: 1,
    backgroundColor: '#7c3aed',
    marginVertical: 12,
    opacity: 0.6,
  },
  tagline: {
    color: '#475569',
    fontSize: 10,
    letterSpacing: 4,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
});
