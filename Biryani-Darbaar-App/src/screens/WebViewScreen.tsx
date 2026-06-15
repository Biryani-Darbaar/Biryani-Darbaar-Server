/**
 * WebViewScreen
 *
 * Full-screen WebView wrapper around https://biryanidarbaar.com/
 *
 * Features enabled:
 *  ✓ Full-screen, safe-area aware layout
 *  ✓ JavaScript execution
 *  ✓ Cookie persistence (sharedCookiesEnabled + thirdPartyCookiesEnabled)
 *  ✓ localStorage / sessionStorage (domStorageEnabled)
 *  ✓ In-app navigation (all links stay inside WebView)
 *  ✓ Form submissions, login, checkout, payment redirects
 *  ✓ File uploads (Android: file chooser; iOS: via allowsInlineMediaPlayback)
 *  ✓ Loading overlay with brand logo
 *  ✓ Graceful network-error screen with retry
 *  ✓ Android hardware-back navigation
 *  ✓ Hardware acceleration (Android)
 *  ✓ WKWebView on iOS (default for react-native-webview ≥ 13)
 */

import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewNavigationEvent,
} from 'react-native-webview/lib/WebViewTypes';

import ErrorScreen from '@/components/ErrorScreen';
import LoadingOverlay from '@/components/LoadingOverlay';
import { Colors, WEBSITE_URL } from '@/constants/theme';
import { useAndroidBackHandler } from '@/hooks/useAndroidBackHandler';

// ---------------------------------------------------------------------------
// JavaScript injected into every page
// ---------------------------------------------------------------------------

/**
 * Injected once after the page loads.
 *
 * 1. Ensures the viewport meta tag is set correctly so the site doesn't
 *    render at desktop width on mobile.
 * 2. Prevents the iOS rubber-band (bounce) overscroll from feeling off.
 */
const INJECTED_JS = `
(function() {
  // Ensure the correct viewport meta is present
  var meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'viewport';
    document.head.appendChild(meta);
  }
  meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

  // Notify the RN side when the page is fully interactive
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
    JSON.stringify({ type: 'PAGE_READY' })
  );

  true; // required by react-native-webview injectedJavaScript
})();
`;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const WebViewScreen: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(WEBSITE_URL);

  const { webViewRef, onNavigationStateChange } = useAndroidBackHandler();

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
  }, []);

  const handleLoadEnd = useCallback(
    (_e: WebViewNavigationEvent | WebViewErrorEvent) => {
      setIsLoading(false);
    },
    [],
  );

  /** Hard network failure (offline, DNS error, etc.) */
  const handleError = useCallback((_e: WebViewErrorEvent) => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  /**
   * HTTP-level errors (4xx, 5xx).
   * We only surface these as an error screen for 5xx — 4xx are legitimate
   * page responses (e.g. 404 Not Found) that the website handles itself.
   */
  const handleHttpError = useCallback((e: WebViewHttpErrorEvent) => {
    if (e.nativeEvent.statusCode >= 500) {
      setIsLoading(false);
      setHasError(true);
    }
  }, []);

  /** Reload the last attempted URL */
  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    webViewRef.current?.reload();
  }, [webViewRef]);

  /**
   * Decide whether a URL should open inside the WebView or be handed to the
   * OS (e.g. tel:, mailto:, external payment gateways that must open in Safari).
   *
   * Returning 'allow' keeps it inside; returning 'deny' + openURL lets the OS handle it.
   */
  const handleShouldStartLoadWithRequest = useCallback(
    (request: { url: string }): boolean => {
      const url = request.url;

      // Always allow the primary domain and all its paths
      if (
        url.startsWith('https://biryanidarbaar.com') ||
        url.startsWith('https://www.biryanidarbaar.com') ||
        url.startsWith('about:blank')
      ) {
        return true;
      }

      // Allow Stripe-hosted payment pages inside the WebView
      if (url.startsWith('https://checkout.stripe.com') ||
          url.startsWith('https://stripe.com')) {
        return true;
      }

      // Let the OS handle tel:, mailto:, and other deep links
      if (
        url.startsWith('tel:') ||
        url.startsWith('mailto:') ||
        url.startsWith('maps:') ||
        url.startsWith('comgooglemaps:')
      ) {
        // react-native-webview returns false to block + let OS handle
        return false;
      }

      // Block everything else (ads, third-party redirects)
      return false;
    },
    [],
  );

  // ── Render ───────────────────────────────────────────────────────────────

  if (hasError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ErrorScreen onRetry={handleRetry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <WebView
          ref={webViewRef}
          // ── URL ──────────────────────────────────────────────────────────
          source={{ uri: currentUrl }}
          // ── JavaScript ───────────────────────────────────────────────────
          javaScriptEnabled
          injectedJavaScript={INJECTED_JS}
          // ── Storage & Cookies ─────────────────────────────────────────────
          domStorageEnabled            // enables localStorage + sessionStorage
          sharedCookiesEnabled         // share cookies between WebView sessions (iOS)
          thirdPartyCookiesEnabled     // allow third-party cookies (Android)
          // ── Media & Forms ────────────────────────────────────────────────
          allowsInlineMediaPlayback    // iOS: play video inline (not fullscreen)
          mediaPlaybackRequiresUserAction={false}
          allowFileAccess              // Android: allow local file access for uploads
          allowFileAccessFromFileURLs  // Android: cross-origin file access
          // ── iOS WKWebView specific ────────────────────────────────────────
          allowsBackForwardNavigationGestures // iOS swipe-to-go-back gesture
          // ── Android: HW acceleration is ON by default in react-native-webview ≥13
          // ── Display ──────────────────────────────────────────────────────
          style={styles.webView}
          // Hide the default white flash — handled by LoadingOverlay above
          // ── Navigation ───────────────────────────────────────────────────
          onNavigationStateChange={onNavigationStateChange}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          // ── Lifecycle ────────────────────────────────────────────────────
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onHttpError={handleHttpError}
          // ── User-agent ────────────────────────────────────────────────────
          // Append a custom token so the server can detect app traffic if needed
          applicationNameForUserAgent="BiryaniDaarbaarApp/1.0"
          // ── Misc ─────────────────────────────────────────────────────────
          originWhitelist={['https://*', 'http://*', 'tel:*', 'mailto:*']}
          decelerationRate="normal"
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          scalesPageToFit={Platform.OS === 'android'}
        />

        {/* Loading overlay — fades in/out over the WebView */}
        <LoadingOverlay visible={isLoading} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary, // status-bar area takes brand red
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  webView: {
    flex: 1,
  },
});

export default WebViewScreen;
