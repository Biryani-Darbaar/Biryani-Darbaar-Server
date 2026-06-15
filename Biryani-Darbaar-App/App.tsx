/**
 * App.tsx — root component
 *
 * Responsibilities:
 *  1. Hide the native splash screen once the JS bundle is ready.
 *  2. Wrap the app in SafeAreaProvider (required by react-native-safe-area-context).
 *  3. Configure the status bar to match the brand colour scheme.
 *  4. Render WebViewScreen as the sole screen.
 */

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import WebViewScreen from '@/screens/WebViewScreen';
import { Colors } from '@/constants/theme';

// Keep the splash screen visible while we initialise
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    // Hide the splash screen on the next frame after the component mounts.
    // For a WebView-only app there's no async initialisation, so we can hide
    // it immediately.  The LoadingOverlay inside WebViewScreen takes over.
    const hide = async () => {
      await SplashScreen.hideAsync();
    };
    hide();
  }, []);

  return (
    <SafeAreaProvider>
      {/*
        'light-content' renders white icons/text on the status bar,
        which looks correct against the primary red SafeAreaView background.
      */}
      <StatusBar style="light" backgroundColor={Colors.primary} translucent={false} />
      <View style={styles.root}>
        <WebViewScreen />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
});
