import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { FascaLogoMark } from './SplashScreen';
import { apiLogin } from '../lib/api';
import { saveToken } from '../lib/storage';

interface Props {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const token = await apiLogin(email.trim(), password);
      await saveToken(token);
      onLoginSuccess();
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#060611" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={styles.logoSection}>
          <FascaLogoMark size={72} />
          <Text style={styles.wordmark}>FASCA</Text>
          <Text style={styles.tagline}>Focus Companion</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>SIGN IN</Text>
          <Text style={styles.cardSub}>Access your Digital Sanctuary</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput
              style={[styles.input, emailFocused && styles.inputFocused]}
              placeholder="your@email.com"
              placeholderTextColor="#334155"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>SECURITY KEY</Text>
            <TextInput
              style={[styles.input, passFocused && styles.inputFocused]}
              placeholder="••••••••"
              placeholderTextColor="#334155"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.loginBtnText}>ESTABLISH CONNECT</Text>
            )}
          </TouchableOpacity>

          {/* Decorative footer */}
          <View style={styles.cardFooter}>
            <View style={styles.footerLine} />
            <Text style={styles.footerText}>FASCA OS v1.0</Text>
            <View style={styles.footerLine} />
          </View>
        </View>

        {/* Info badge */}
        <View style={styles.infoBadge}>
          <Text style={styles.infoBadgeText}>
            🔒 Your sessions are end-to-end encrypted
          </Text>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060611',
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  logoSection: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  wordmark: {
    color: '#e2e8f0',
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 10,
  },
  tagline: {
    color: '#475569',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    borderRadius: 20,
    padding: 28,
    gap: 16,
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  cardSub: {
    color: '#475569',
    fontSize: 11,
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: '#64748b',
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#e2e8f0',
    fontSize: 14,
  },
  inputFocused: {
    borderColor: '#7c3aed',
    backgroundColor: 'rgba(124,58,237,0.05)',
  },
  loginBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  footerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  footerText: {
    color: '#334155',
    fontSize: 9,
    letterSpacing: 2,
  },
  infoBadge: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
  },
  infoBadgeText: {
    color: '#7c3aed',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
