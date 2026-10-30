import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Platform, StatusBar as RNStatusBar } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';

export default function Header({ title = 'AI Ticket It', subtitle = 'Explorar', showBack = false, onBack }) {
  const { userRole, toggleUserRole, currentUser } = useApp();
  const insets = useSafeAreaInsets();

  // Top inset to clear status bar / notch on any device
  const topInset = insets.top > 0 ? insets.top : Platform.OS === 'android' ? RNStatusBar.currentHeight || 28 : 12;

  return (
    <View style={[styles.headerContainer, { paddingTop: topInset, height: 60 + topInset }]}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
            <MaterialIcons name="arrow-back-ios" size={18} color={COLORS.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.logoBadge}>
          <Ionicons name="ticket" size={20} color={COLORS.accentElectric} />
        </View>
        <View style={styles.titleColumn}>
          <Text style={styles.appTitle}>{title}</Text>
          <Text style={styles.subTitle}>{subtitle.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        {/* Role Toggle Switch for presentation / demo */}
        <TouchableOpacity style={styles.roleBadge} onPress={toggleUserRole} activeOpacity={0.8}>
          <View
            style={[
              styles.roleDot,
              { backgroundColor: userRole === 'comprador' ? COLORS.tertiary : COLORS.accentElectric },
            ]}
          />
          <Text style={styles.roleText}>
            {userRole === 'comprador' ? 'Modo Comprador' : 'Modo Organizador'}
          </Text>
        </TouchableOpacity>

        {/* User Avatar */}
        <TouchableOpacity style={styles.avatarButton} onPress={toggleUserRole}>
          <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceCardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  subTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.tertiary,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.primaryContainer,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
