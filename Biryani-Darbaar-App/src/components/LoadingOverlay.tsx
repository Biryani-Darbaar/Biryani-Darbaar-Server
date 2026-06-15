/**
 * LoadingOverlay
 *
 * Shown while the WebView is loading a page.
 * Displays the brand logo centred on a white screen with the primary-red
 * activity indicator underneath — matching the website's visual identity.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { Colors } from '@/constants/theme';

const logo = require('../../assets/logo.png');

interface Props {
  visible: boolean;
}

const LoadingOverlay: React.FC<Props> = ({ visible }) => {
  // Fade the overlay in/out instead of abruptly hiding it
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  // Completely remove from layout once invisible so it doesn't intercept touches
  if (!visible && (opacity as unknown as { _value: number })._value === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Image source={logo} style={styles.logo} resizeMode="contain" />
      <ActivityIndicator
        size="large"
        color={Colors.primary}
        style={styles.spinner}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  logo: {
    width: 160,
    height: 160,
  },
  spinner: {
    marginTop: 24,
  },
});

export default LoadingOverlay;
