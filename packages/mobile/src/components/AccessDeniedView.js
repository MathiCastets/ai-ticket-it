import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import Header from './Header';

export default function AccessDeniedView({
  headerTitle = 'AI Ticket It',
  headerSubtitle = 'Acceso Restringido',
  title = 'No tenés permisos para ver este recurso',
  message = 'Intentá ingresar con otra cuenta o contactá al soporte si creés que deberías tener acceso.',
  navigation,
  onBack,
  actionText = 'Volver',
}) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else if (navigation?.navigate) {
      navigation.navigate('MainTabs');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title={headerTitle}
        subtitle={headerSubtitle}
        showBack={Boolean(onBack || navigation?.canGoBack?.())}
        onBack={handleBack}
      />
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-half-outline" size={46} color={COLORS.accentElectric} />
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity style={styles.actionBtn} onPress={handleBack} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={18} color={COLORS.textPrimary} style={{ marginRight: 8 }} />
          <Text style={styles.actionBtnText}>{actionText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 0, 127, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 160,
  },
  actionBtnText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
