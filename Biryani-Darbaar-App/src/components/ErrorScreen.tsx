/**
 * ErrorScreen
 *
 * Displayed when the WebView encounters a network error (e.g. no internet,
 * DNS failure, server down).  Mirrors the brand colour scheme and provides
 * a single "Try Again" action.
 */

import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, FontSize, Spacing } from '@/constants/theme';

const logo = require('../../assets/logo.png');

interface Props {
  /** Human-readable description of the error */
  message?: string;
  /** Called when the user presses "Try Again" */
  onRetry: () => void;
}

const ErrorScreen: React.FC<Props> = ({
  message = 'Could not connect to Biryani Darbaar.\nPlease check your internet connection.',
  onRetry,
}) => (
  <View style={styles.container}>
    <Image source={logo} style={styles.logo} resizeMode="contain" />

    <Text style={styles.title}>Oops! Something went wrong.</Text>
    <Text style={styles.message}>{message}</Text>

    <TouchableOpacity
      style={styles.button}
      onPress={onRetry}
      activeOpacity={0.85}
    >
      <Text style={styles.buttonText}>Try Again</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: Spacing[6],
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  message: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing[8],
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[8],
    borderRadius: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
});

export default ErrorScreen;
