import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getBlocklist, addToBlocklist, removeFromBlocklist } from '../lib/api';

interface BlocklistItem {
  id: string;
  type: 'DOMAIN' | 'APP';
  value: string;
  label?: string;
}

interface Props {
  onBack: () => void;
}

const QUICK_SITES = ['youtube.com', 'instagram.com', 'twitter.com', 'tiktok.com', 'reddit.com', 'facebook.com'];
const QUICK_APPS  = ['com.google.android.youtube', 'com.instagram.android', 'com.twitter.android', 'com.zhiliaoapp.musically', 'com.reddit.frontpage'];

export default function BlocklistScreen({ onBack }: Props) {
  const [tab, setTab]           = useState<'DOMAIN' | 'APP'>('DOMAIN');
  const [items, setItems]       = useState<BlocklistItem[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [adding, setAdding]     = useState(false);

  useEffect(() => {
    loadBlocklist();
  }, []);

  const loadBlocklist = async () => {
    setLoading(true);
    try {
      const data = await getBlocklist();
      setItems(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleAdd = async (value?: string) => {
    const val = (value ?? input).trim().toLowerCase();
    if (!val) return;
    setAdding(true);
    try {
      const item = await addToBlocklist(tab, val, val);
      setItems(prev => [...prev.filter(x => !(x.type === tab && x.value === val)), item]);
      setInput('');
    } catch { /* dupe silently ignored */ }
    finally { setAdding(false); }
  };

  const handleRemove = (id: string) => {
    Alert.alert('Remove', 'Remove this item from your blocklist?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setItems(prev => prev.filter(x => x.id !== id));
          await removeFromBlocklist(id);
        },
      },
    ]);
  };

  const filtered   = items.filter(x => x.type === tab);
  const quickAdds  = tab === 'DOMAIN' ? QUICK_SITES : QUICK_APPS;
  const alreadyAdded = (v: string) => filtered.some(x => x.value === v);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#060611" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </TouchableOpacity>
        <Text style={styles.title}>BLOCKLIST</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'DOMAIN' && styles.tabActive]}
          onPress={() => setTab('DOMAIN')}
        >
          <Text style={[styles.tabText, tab === 'DOMAIN' && styles.tabTextActive]}>🌐 WEBSITES</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'APP' && styles.tabActive]}
          onPress={() => setTab('APP')}
        >
          <Text style={[styles.tabText, tab === 'APP' && styles.tabTextActive]}>📱 ANDROID APPS</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Add Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder={tab === 'DOMAIN' ? 'e.g. instagram.com' : 'e.g. com.instagram.android'}
            placeholderTextColor="#334155"
            value={input}
            onChangeText={setInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd()} disabled={adding}>
            {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>ADD</Text>}
          </TouchableOpacity>
        </View>

        {/* Quick Add */}
        <View style={styles.quickSection}>
          <Text style={styles.sectionLabel}>QUICK ADD</Text>
          <View style={styles.chips}>
            {quickAdds.map(q => (
              <TouchableOpacity
                key={q}
                style={[styles.chip, alreadyAdded(q) && styles.chipAdded]}
                onPress={() => !alreadyAdded(q) && handleAdd(q)}
                disabled={alreadyAdded(q)}
              >
                <Text style={[styles.chipText, alreadyAdded(q) && styles.chipTextAdded]}>
                  {alreadyAdded(q) ? '✓ ' : '+ '}
                  {q.length > 24 ? q.substring(0, 24) + '...' : q}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Current blocklist */}
        <Text style={styles.sectionLabel}>
          CURRENT BLOCKLIST ({filtered.length})
        </Text>

        {loading ? (
          <ActivityIndicator color="#7c3aed" style={{ marginTop: 24 }} />
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>{tab === 'DOMAIN' ? '🌐' : '📱'}</Text>
            <Text style={styles.emptyTitle}>Nothing blocked yet</Text>
            <Text style={styles.emptySub}>Add {tab === 'DOMAIN' ? 'websites' : 'Android package names'} above to get started.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filtered.map(item => (
              <View key={item.id} style={styles.listItem}>
                <Text style={styles.listItemText} numberOfLines={1}>{item.label || item.value}</Text>
                <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeBtn}>
                  <Text style={styles.removeText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#7c3aed' },
  tabText: { color: '#475569', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  tabTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#e2e8f0',
    fontSize: 13,
  },
  addBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  quickSection: { gap: 10 },
  sectionLabel: { color: '#334155', fontSize: 9, letterSpacing: 3, fontWeight: '600', textTransform: 'uppercase' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipAdded: { backgroundColor: 'rgba(5,150,105,0.1)', borderColor: 'rgba(5,150,105,0.3)' },
  chipText: { color: '#a78bfa', fontSize: 11 },
  chipTextAdded: { color: '#34d399' },
  list: { gap: 8 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listItemText: { flex: 1, color: '#94a3b8', fontSize: 13, fontFamily: 'monospace' },
  removeBtn: { padding: 4 },
  removeText: { color: '#f87171', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { color: '#475569', fontSize: 15, fontWeight: '600' },
  emptySub: { color: '#334155', fontSize: 11, textAlign: 'center', lineHeight: 17 },
});
