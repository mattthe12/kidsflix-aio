import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Baloo2_700Bold, Baloo2_800ExtraBold } from '@expo-google-fonts/baloo-2';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from '@expo-google-fonts/nunito';

import { AppProvider, useApp } from './src/state/AppProvider';
import { NavProvider, useNav } from './src/nav';
import { Logo } from './src/components/Logo';
import { TabBar } from './src/components/TabBar';
import { colors, font, gradients } from './src/theme';

import { WelcomeScreen } from './src/screens/WelcomeScreen';
import { AuthScreen } from './src/screens/AuthScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { AdminPasswordChangeScreen } from './src/screens/AdminPasswordChangeScreen';
import { AdminDashboardScreen } from './src/screens/AdminDashboardScreen';
import { PinSetupScreen } from './src/screens/PinSetupScreen';
import { ProfilePickerScreen } from './src/screens/ProfilePickerScreen';
import { ProfileFormScreen } from './src/screens/ProfileFormScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ShowsScreen } from './src/screens/ShowsScreen';
import { LearningScreen } from './src/screens/LearningScreen';
import { FavoritesScreen } from './src/screens/FavoritesScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { CategoryScreen } from './src/screens/CategoryScreen';
import { TitleScreen } from './src/screens/TitleScreen';
import { PlayerScreen } from './src/screens/PlayerScreen';
import { DownloadsScreen } from './src/screens/DownloadsScreen';
import { ParentGateScreen } from './src/screens/ParentGateScreen';
import { ParentDashboardScreen } from './src/screens/ParentDashboardScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { SubscriptionScreen } from './src/screens/SubscriptionScreen';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { MyWorldScreen } from './src/screens/MyWorldScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';

function Splash({ message = 'Getting things ready…' }: { message?: string }) {
  return (
    <View style={styles.splash}>
      <LinearGradient colors={gradients.app} style={StyleSheet.absoluteFill} />
      <View style={styles.splashGlow} />
      <Logo size={44} />
      <Text style={styles.splashTag}>A magical world of safe watching 🌈</Text>
      <ActivityIndicator color={colors.pink} style={{ marginTop: 18 }} />
      <Text style={styles.splashMsg}>{message}</Text>
    </View>
  );
}

function TabScreens() {
  const nav = useNav();
  switch (nav.tab) {
    case 'shows':
      return <ShowsScreen />;
    case 'learning':
      return <LearningScreen />;
    case 'favorites':
      return <FavoritesScreen />;
    case 'profile':
      return <ProfileScreen />;
    default:
      return <HomeScreen />;
  }
}

function Root() {
  const { ready, recovery, admin, account, settings, profiles, profile, parentUnlocked, lockParent } = useApp();
  const nav = useNav();
  const [authMode, setAuthMode] = useState<'login' | 'signup' | null>(null);

  useEffect(() => {
    if (!account) setAuthMode(null);
  }, [account]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (nav.canGoBack) {
        nav.back();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [nav.canGoBack, nav.back]);

  if (!ready) return <Splash />;
  if (recovery) return <ResetPasswordScreen />;
  if (admin?.mustChangePassword) return <AdminPasswordChangeScreen />;
  if (admin) return <AdminDashboardScreen />;

  if (!account) {
    if (!authMode) {
      return (
        <WelcomeScreen
          onStart={() => setAuthMode('signup')}
          onSignIn={() => setAuthMode('login')}
        />
      );
    }
    return <AuthScreen initialMode={authMode} onBack={() => setAuthMode(null)} />;
  }

  if (!settings.pinHash) return <PinSetupScreen />;
  if (profiles.length === 0) return <ProfileFormScreen standalone />;
  if (!profile) return <ProfilePickerScreen />;

  const { route } = nav;

  if (route.name === 'player') {
    return <PlayerScreen key={`${route.titleId}:${route.episodeId ?? 'first'}`} titleId={route.titleId} episodeId={route.episodeId} />;
  }

  let content: React.ReactNode = null;
  switch (route.name) {
    case 'tabs':
      content = (
        <View style={{ flex: 1 }}>
          <TabScreens />
          <TabBar />
        </View>
      );
      break;
    case 'title':
      content = <TitleScreen titleId={route.titleId} />;
      break;
    case 'search':
      content = <SearchScreen />;
      break;
    case 'category':
      content = <CategoryScreen category={route.category} subcategory={route.subcategory} />;
      break;
    case 'downloads':
      content = <DownloadsScreen />;
      break;
    case 'world':
      content = <MyWorldScreen />;
      break;
    case 'collection':
      content = <CollectionScreen collectionId={route.collectionId} />;
      break;
    case 'profiles':
      content = <ProfilePickerScreen onSelect={() => nav.back()} />;
      break;
    case 'profileForm':
      content = <ProfileFormScreen profileId={route.profileId} onDone={() => nav.back()} />;
      break;
    case 'parentGate':
      content = <ParentGateScreen then={route.then} />;
      break;
    case 'parentSetup':
      if (!parentUnlocked) {
        content = <ParentGateScreen then="dashboard" />;
      } else {
        content = <PinSetupScreen onDone={() => nav.back()} />;
      }
      break;
    case 'parent':
      content = parentUnlocked ? <ParentDashboardScreen /> : <ParentGateScreen then="dashboard" />;
      break;
    case 'settings':
      content = parentUnlocked ? <SettingsScreen /> : <ParentGateScreen then="settings" />;
      break;
    case 'subscription':
      content = parentUnlocked ? <SubscriptionScreen /> : <ParentGateScreen then="subscription" />;
      break;
    default:
      content = <HomeScreen />;
  }

  return <View style={{ flex: 1, backgroundColor: colors.bg }}>{content}</View>;
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return <Splash message="Loading friendly fonts…" />;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <NavProvider>
          <ErrorBoundary>
            <Root />
          </ErrorBoundary>
        </NavProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, gap: 10 },
  splashGlow: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255,92,168,0.18)',
  },
  splashTag: { fontFamily: font.medium, fontSize: 13, color: colors.textDim },
  splashMsg: { fontFamily: font.medium, fontSize: 11, color: colors.textFaint, marginTop: 6 },
});
