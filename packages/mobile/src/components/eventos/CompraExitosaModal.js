import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export default function CompraExitosaModal({
  visible,
  eventoNombre,
  tipoNombre,
  cantidad,
  total,
  onClose,
  onVerMisTickets,
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.successModalCard} accessibilityViewIsModal={true}>
          <View style={styles.successIconBox}>
            <Ionicons name="checkmark-done" size={32} color={COLORS.statusSuccess} />
          </View>
          <Text style={styles.modalTitle}>¡Compra Confirmada!</Text>
          <Text style={styles.modalSubtitle}>
            Tu entrada para <Text style={{ color: COLORS.textPrimary, fontWeight: '700' }}>{eventoNombre}</Text> fue registrada con éxito.
          </Text>

          <View style={styles.modalDetailsBox}>
            <Text style={styles.modalDetailRow}>Entrada: {tipoNombre} (x{cantidad})</Text>
            <Text style={styles.modalDetailRow}>Total: ${total?.toLocaleString('es-AR')}</Text>
            <Text style={[styles.modalDetailRow, { color: COLORS.statusSuccess }]}>Estado: CONFIRMADA</Text>
          </View>

          <TouchableOpacity style={styles.modalActionBtn} onPress={onVerMisTickets} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.modalActionText}>VER MIS TICKETS</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 8, 29, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  successIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 245, 160, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDetailsBox: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 4,
  },
  modalDetailRow: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalActionBtn: {
    width: '100%',
    backgroundColor: COLORS.accentElectric,
    paddingVertical: 13,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
});
