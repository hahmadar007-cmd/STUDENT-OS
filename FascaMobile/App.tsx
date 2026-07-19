/**
 * Fasca Mobile – App.tsx
 * Root navigator: Splash → Login → Dashboard / Blocklist / SessionSetup
 */

import React, { useState, useEffect } from 'react';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import BlocklistScreen from './src/screens/BlocklistScreen';
import SessionSetupScreen from './src/screens/SessionSetupScreen';
import NodesScreen from './src/screens/NodesScreen';
import GroupsScreen from './src/screens/GroupsScreen';
import { getToken } from './src/lib/storage';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, Alert } from 'react-native';

const Tab = createBottomTabNavigator();

function MainTabs({ onLogout, onGoToBlocklist, onGoToSetup }: any) {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Tab.Navigator 
        screenOptions={{ 
          headerShown: false, 
          tabBarStyle: { backgroundColor: '#060611', borderTopColor: 'rgba(124,58,237,0.15)' }, 
          tabBarActiveTintColor: '#7c3aed',
          tabBarInactiveTintColor: '#475569'
        }}
      >
        <Tab.Screen name="Focus" options={{ tabBarIcon: () => <Text style={{fontSize: 20}}>⏱</Text> }}>
          {() => <DashboardScreen onLogout={onLogout} onGoToBlocklist={onGoToBlocklist} onGoToSetup={onGoToSetup} />}
        </Tab.Screen>
        <Tab.Screen name="Nodes" component={NodesScreen} options={{ tabBarIcon: () => <Text style={{fontSize: 20}}>🧠</Text> }} />
        <Tab.Screen name="Groups" component={GroupsScreen} options={{ tabBarIcon: () => <Text style={{fontSize: 20}}>💬</Text> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

type Screen = 'splash' | 'login' | 'dashboard' | 'blocklist' | 'session-setup';

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash');

  useEffect(() => {
    Alert.alert(
      "Notice",
      "This app's purpose is to help you focus on studying. It is not the actual OS.",
      [{ text: "I understand" }]
    );
  }, []);

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
        <MainTabs
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
