/**
 * Fasca Mobile – App.tsx
 * Root navigator: Splash → Login → Dashboard / Blocklist / SessionSetup
 */

import React, { useState } from 'react';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import BlocklistScreen from './src/screens/BlocklistScreen';
import SessionSetupScreen from './src/screens/SessionSetupScreen';
import { getToken } from './src/lib/storage';

type Screen = 'splash' | 'login' | 'dashboard' | 'blocklist' | 'session-setup';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');

  // After splash: check if user is logged in
  const handleSplashFinish = async () => {
    const token = await getToken();
    setScreen(token ? 'dashboard' : 'login');
  };

  const handleLogin = () => setScreen('dashboard');
  const handleLogout = () => setScreen('login');

  switch (screen) {
    case 'splash':
      return <SplashScreen onFinish={handleSplashFinish} />;

    case 'login':
      return <LoginScreen onLoginSuccess={handleLogin} />;

    case 'dashboard':
      return (
        <DashboardScreen
          onLogout={handleLogout}
          onGoToBlocklist={() => setScreen('blocklist')}
          onGoToSetup={() => setScreen('session-setup')}
        />
      );

    case 'blocklist':
      return <BlocklistScreen onBack={() => setScreen('dashboard')} />;

    case 'session-setup':
      return (
        <SessionSetupScreen
          onBack={() => setScreen('dashboard')}
          onSessionStarted={() => setScreen('dashboard')}
        />
      );

    default:
      return null;
  }
}
