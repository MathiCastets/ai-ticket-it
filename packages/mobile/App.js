import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';
import { COLORS } from './src/theme/colors';

export default function App() {
  return (
    <SafeAreaProvider>
      <View style={styles.outerContainer}>
        <View style={styles.mobileShell}>
          <AppProvider>
            <StatusBar style="light" backgroundColor="#0F081D" translucent />
            <AppNavigator />
          </AppProvider>
        </View>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#07040D',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  mobileShell: {
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? 480 : undefined,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
});
