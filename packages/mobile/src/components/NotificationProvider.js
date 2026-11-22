import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const NotificationContext = createContext(null);

const NOTIFICATION_STYLES = {
  error: { color: COLORS.statusDanger, icon: 'alert-circle' },
  success: { color: COLORS.statusSuccess, icon: 'checkmark-circle' },
  warning: { color: COLORS.statusWarning, icon: 'warning' },
  info: { color: COLORS.tertiary, icon: 'information-circle' },
};

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe usarse dentro de NotificationProvider.');
  }
  return context;
}

export default function NotificationProvider({ children }) {
  const insets = useSafeAreaInsets();
  const [notification, setNotification] = useState(null);
  const timeoutRef = useRef(null);

  const dismissNotification = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setNotification(null);
  }, []);

  const notify = useCallback((nextNotification) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setNotification(nextNotification);
    timeoutRef.current = setTimeout(
      () => {
        setNotification(null);
        timeoutRef.current = null;
      },
      nextNotification.type === 'error' ? 6000 : 4000
    );
  }, []);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const appearance = notification
    ? NOTIFICATION_STYLES[notification.type] || NOTIFICATION_STYLES.info
    : null;

  return (
    <NotificationContext.Provider value={{ notify }}>
      <View style={styles.container}>
        {children}
        {notification && (
          <View
            pointerEvents="box-none"
            style={[styles.notificationHost, { top: insets.top + 8 }]}
          >
            <TouchableOpacity
              style={[styles.notification, { borderLeftColor: appearance.color }]}
              onPress={dismissNotification}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel={`${notification.title}. ${notification.message}. Toca para cerrar.`}
              accessibilityLiveRegion="polite"
            >
              <Ionicons
                name={appearance.icon}
                size={24}
                color={appearance.color}
                style={styles.icon}
              />
              <View style={styles.textContainer}>
                <Text style={styles.title}>{notification.title}</Text>
                <Text style={styles.message}>{notification.message}</Text>
              </View>
              <Ionicons name="close" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </NotificationContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notificationHost: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 20,
  },
  notification: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: COLORS.borderGlass,
    backgroundColor: COLORS.surfaceContainerHigh,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
