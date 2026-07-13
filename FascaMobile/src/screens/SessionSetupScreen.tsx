import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { startSession } from '../lib/api';

interface Props {
  onBack: () => void;
  onSessionStarted: () => void;
}

const BREAK_OPTIONS = [
  { label: '5 min', ms: 300_000 },
  { label: '10 min', ms: 600_000 },
  { label: '15 min', ms: 900_000 },
  { label: '20 min', ms: 1_200_000 },
];

const HOUR_OPTIONS    = [0, 1, 2, 3, 4, 5, 6];
const MINUTE_OPTIONS  = [0, 15, 30, 45];
const BREAK_COUNTS    = [0, 1, 2, 3, 4, 5];

function Picker<T extends string | number>({
  label,
  options,
  value,
  onSelect,
  format,
}: {
  label: string;
  options: T[];
  value: T;
  onSelect: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <View style={pickerStyles.container}>
      <Text style={pickerStyles.label}>{label}</Text>
      <View style={pickerStyles.row}>
        {options.map(opt => (
          <TouchableOpacity
            key={String(opt)}
            style={[pickerStyles.option, opt === value && pickerStyles.optionActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[pickerStyles.optionText, opt === value && pickerStyles.optionTextActive]}>
              {format ? format(opt) : String(opt)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  container: { gap: 8 },
  label: { color: '#64748b', fontSize: 9, letterSpacing: 3, fontWeight: '600', textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  optionActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  optionText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  optionTextActive: { color: '#fff' },
});

export default function SessionSetupScreen({ onBack, onSessionStarted }: Props) {
  const [hours, setHours]       = useState(1);
  const [minutes, setMinutes]   = useState(30);
  const [breaks, setBreaks]     = useState(2);
  const [breakMs, setBreakMs]   = useState(600_000);
  const [loading, setLoading]   = useState(false);

  const totalMs     = (hours * 60 + minutes) * 60_000;
  const studyChunkMs = breaks > 0
    ? Math.floor((totalMs - breaks * breakMs) / (breaks + 1))
    : totalMs;

  const handleStart = async () => {
    if (hours === 0 && minutes === 0) {
      Alert.alert('Error', 'Please set a session duration.');
      return;
    }
    Alert.alert(
      '🔒 Initiate Focus',
      `Start a ${hours}h ${minutes}m session with ${breaks} break${breaks !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start', style: 'default',
          onPress: async () => {
            setLoading(true);
            try {
              await startSession({
                totalDurationMs: totalMs,
                numberOfBreaks: breaks,
                breakDurationMs: breakMs,
                strictMode: false,
              });
              onSessionStarted();
            } catch {
              Alert.alert('Error', 'Failed to start session. Please check your connection.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const breakLabel = BREAK_OPTIONS.find(b => b.ms === breakMs)?.label ?? '10 min';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#060611" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>SESSION SETUP</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Duration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>⏱ SESSION DURATION</Text>
          <Picker label="Hours" options={HOUR_OPTIONS} value={hours} onSelect={setHours} format={v => `${v}h`} />
          <Picker label="Minutes" options={MINUTE_OPTIONS} value={minutes} onSelect={setMinutes} format={v => `${v}m`} />
        </View>

        {/* Breaks */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>☕ HOW MANY BREAKS?</Text>
          <Picker label="Number of breaks" options={BREAK_COUNTS} value={breaks} onSelect={setBreaks} format={v => String(v)} />
          {breaks > 0 && (
            <>
              <Picker
                label="Break duration (each)"
                options={BREAK_OPTIONS.map(b => b.ms)}
                value={breakMs}
                onSelect={setBreakMs}
                format={v => BREAK_OPTIONS.find(b => b.ms === v)?.label ?? '?'}
              />
              <View style={styles.hint}>
                <Text style={styles.hintText}>
                  ☝️ During breaks, ALL locks lift automatically. Apps and sites are unblocked. Locks re-engage exactly when time is up.
                </Text>
              </View>
            </>
          )}
          {breaks === 0 && (
            <View style={[styles.hint, { borderColor: 'rgba(239,68,68,0.2)', backgroundColor: 'rgba(239,68,68,0.05)' }]}>
              <Text style={[styles.hintText, { color: '#f87171' }]}>
                ⚠️ No breaks – maximum focus mode. You won't be able to open blocked apps until the session ends.
              </Text>
            </View>
          )}
        </View>

        {/* Summary */}
        {(hours > 0 || minutes > 0) && (
          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>SESSION OVERVIEW</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryKey}>Total time</Text>
              <Text style={styles.summaryVal}>{hours}h {minutes}m</Text>
            </View>
            {breaks > 0 && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Study blocks</Text>
                  <Text style={styles.summaryVal}>{breaks + 1} × ~{Math.floor(studyChunkMs / 60_000)} min</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Breaks</Text>
                  <Text style={[styles.summaryVal, { color: '#34d399' }]}>{breaks} × {breakLabel}</Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Start Button */}
        <TouchableOpacity
          style={[styles.startBtn, (loading || (hours === 0 && minutes === 0)) && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={loading || (hours === 0 && minutes === 0)}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startBtnText}>🔒 INITIATE FOCUS SESSION</Text>
          )}
        </TouchableOpacity>

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
  backBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  backText: { color: '#7c3aed', fontSize: 11, letterSpacing: 2, fontWeight: '600' },
  title: { color: '#e2e8f0', fontSize: 13, fontWeight: '700', letterSpacing: 4 },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 60 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 20,
    gap: 16,
  },
  cardTitle: { color: '#e2e8f0', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  hint: {
    backgroundColor: 'rgba(124,58,237,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    borderRadius: 10,
    padding: 12,
  },
  hintText: { color: '#64748b', fontSize: 11, lineHeight: 17 },
  summary: {
    backgroundColor: 'rgba(124,58,237,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  summaryTitle: { color: '#7c3aed', fontSize: 9, letterSpacing: 3, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryKey: { color: '#64748b', fontSize: 12 },
  summaryVal: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },
  startBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 3 },
});
