import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export default function SortOptionsModal({
  visible,
  opciones,
  selectedSort,
  onSelect,
  onClose,
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.sortModalBackdrop}>
        <TouchableOpacity
          style={styles.sortModalDismiss}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Cerrar opciones de ordenamiento"
        />
        <View style={styles.sortModalCard}>
          <Text style={styles.sortModalTitle}>Ordenar por</Text>
          {opciones.map((opcion) => {
            const activa = selectedSort === opcion.id;
            return (
              <TouchableOpacity
                key={opcion.id}
                style={[styles.sortOption, activa && styles.sortOptionActive]}
                onPress={() => onSelect(opcion.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: activa }}
              >
                <Text style={[styles.sortOptionText, activa && styles.sortOptionTextActive]}>
                  {opcion.label}
                </Text>
                {activa ? (
                  <Ionicons name="checkmark" size={18} color={COLORS.badgeCyanGlow} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sortModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 8, 29, 0.75)',
  },
  sortModalDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  sortModalCard: {
    width: '100%',
    maxWidth: 320,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sortModalTitle: {
    marginBottom: 8,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  sortOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  sortOptionActive: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  sortOptionText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  sortOptionTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
});
