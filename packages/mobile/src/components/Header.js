import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar as RNStatusBar,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';

export default function Header({ title = 'AI Ticket It', subtitle = 'Explorar', showBack = false, onBack }) {
  const { usuarios, seleccionarUsuario, currentUser } = useApp();
  const [isUserPickerVisible, setIsUserPickerVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // Top inset to clear status bar / notch on any device
  const topInset = insets.top > 0 ? insets.top : Platform.OS === 'android' ? RNStatusBar.currentHeight || 28 : 12;

  return (
    <>
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

        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => setIsUserPickerVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Cambiar usuario. Usuario actual: ${currentUser.nombreCompleto}`}
          accessibilityHint="Abre la lista de perfiles disponibles para la demo"
        >
          <Image source={{ uri: currentUser.avatar }} style={styles.avatarImage} />
          <View style={styles.avatarIndicator} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isUserPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsUserPickerVisible(false)}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            style={styles.modalScrim}
            activeOpacity={1}
            onPress={() => setIsUserPickerVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Cerrar selector de usuario"
          />
          <View style={styles.pickerCard}>
            <View style={styles.pickerHeader}>
              <View>
                <Text style={styles.pickerTitle}>Cambiar perfil</Text>
                <Text style={styles.pickerSubtitle}>Elegí con quién querés probar la app</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setIsUserPickerVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.userList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.userListContent}
            >
              {usuarios.map((usuario) => {
                const isSelected = usuario.id === currentUser.id;
                return (
                  <TouchableOpacity
                    key={usuario.id}
                    style={[styles.userOption, isSelected && styles.userOptionSelected]}
                    onPress={() => {
                      seleccionarUsuario(usuario.id);
                      setIsUserPickerVisible(false);
                    }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Image source={{ uri: usuario.avatar }} style={styles.userAvatar} />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{usuario.nombreCompleto}</Text>
                      <Text style={styles.userRole}>
                        {usuario.rol === 'organizador' ? 'Organizador' : 'Comprador'}
                      </Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={21} color={COLORS.tertiary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: COLORS.primaryContainer,
    overflow: 'hidden',
  },
  avatarIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.tertiary,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(4, 8, 16, 0.72)',
  },
  pickerCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '78%',
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  pickerSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 3,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: COLORS.surfaceCard,
  },
  userList: {
    flexGrow: 0,
  },
  userListContent: {
    gap: 8,
  },
  userOption: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: COLORS.surfaceCard,
  },
  userOptionSelected: {
    borderColor: COLORS.tertiary,
    backgroundColor: COLORS.surfaceCardSubtle,
  },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.surfaceContainer,
  },
  userInfo: {
    flex: 1,
    marginLeft: 11,
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userRole: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
