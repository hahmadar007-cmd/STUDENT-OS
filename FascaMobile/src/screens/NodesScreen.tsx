import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import { getToken } from '../lib/storage';

export default function NodesScreen() {
  const [token, setToken] = useState<string | null>(null);
  const webviewRef = useRef<WebView>(null);

  useEffect(() => {
    getToken().then(setToken);
  }, []);

  // Handle hardware back button inside WebView
  useEffect(() => {
    const onBackPress = () => {
      if (webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, []);

  if (!token) return <View style={styles.root} />;

  // Inject script to set the auth token in localStorage so the WebView is automatically logged in
  const injectedJs = `
    if (!localStorage.getItem('fouzar_token')) {
      localStorage.setItem('fouzar_token', '${token}');
      window.location.reload();
    }
    true;
  `;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#060611" />
      <WebView
        ref={webviewRef}
        source={{ uri: 'https://frontend-fasca-os.vercel.app/dashboard' }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={injectedJs}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator color="#7c3aed" size="large" />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#060611', paddingTop: StatusBar.currentHeight || 24 },
  webview: { flex: 1, backgroundColor: '#060611' },
  loader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#060611',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
