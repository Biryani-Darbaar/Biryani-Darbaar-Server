/**
 * useAndroidBackHandler
 *
 * Intercepts the Android hardware back button.
 * If the WebView can go back (user navigated away from the home page),
 * it triggers WebView back-navigation instead of exiting the app.
 *
 * Usage:
 *   const { handleWebViewRef } = useAndroidBackHandler();
 *   <WebView ref={handleWebViewRef} ... />
 */

import { useCallback, useEffect, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

export function useAndroidBackHandler() {
  const webViewRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);

  // Keep a live read of whether the WebView has history
  const onNavigationStateChange = useCallback(
    (navState: { canGoBack: boolean }) => {
      canGoBackRef.current = navState.canGoBack;
    },
    [],
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (canGoBackRef.current) {
          webViewRef.current?.goBack();
          return true; // event consumed — do NOT exit app
        }
        return false; // let the system handle it (exit app)
      },
    );

    return () => subscription.remove();
  }, []);

  return { webViewRef, onNavigationStateChange };
}
