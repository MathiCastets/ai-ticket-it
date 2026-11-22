import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { commonStyles } from '../../theme/commonStyles';

export default function TicketQrModal({ compra, onClose }) {
  if (!compra) return null;

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!compra}
      onRequestClose={onClose}
    >
      <View style={commonStyles.modalBackdrop}>
        <View style={styles.qrModalCard} accessibilityViewIsModal={true}>
          <TouchableOpacity
            style={styles.closeModalBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cerrar código QR"
          >
            <Ionicons name="close" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <View style={styles.qrIconCircle}>
            <Ionicons name="qr-code" size={26} color={COLORS.badgeCyanGlow} />
          </View>

          <Text style={styles.qrEventTitle}>{compra.eventoNombre}</Text>
          <Text style={styles.qrSubtitle}>
            {compra.cantidad}x {compra.tipoEntradaNombre} • {compra.ordenCodigo}
          </Text>

          {/* Realistic QR Container Box */}
          <View style={styles.qrWhiteBox}>
            <Ionicons name="qr-code" size={160} color="#0F081D" />
          </View>

          <View style={styles.qrVerifiedRow}>
            <View style={styles.greenPulse} />
            <Text style={styles.qrVerifiedText}>Entrada digital válida para acreditar</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  qrModalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  closeModalBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 210, 242, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  qrEventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  qrSubtitle: {
    fontSize: 11,
    color: COLORS.tertiary,
    marginTop: 2,
    marginBottom: 14,
  },
  qrWhiteBox: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.badgeCyanGlow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  qrVerifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  greenPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.statusSuccess,
  },
  qrVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.statusSuccess,
  },
});
