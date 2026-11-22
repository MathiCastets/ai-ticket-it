import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export default function PublicacionResultadoModal({ resultado, onClose, onViewEvent }) {
  const esExito = resultado?.tipo === 'exito';

  return (
    <Modal
      visible={!!resultado}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.resultModal}>
          <View
            style={[
              styles.resultIcon,
              esExito ? styles.successIcon : styles.failureIcon,
            ]}
          >
            <Ionicons
              name={esExito ? 'checkmark' : 'alert'}
              size={28}
              color={COLORS.textPrimary}
            />
          </View>
          <Text style={styles.resultTitle}>
            {esExito ? '¡Evento publicado!' : 'No se pudo publicar'}
          </Text>
          <Text style={styles.resultMessage}>{resultado?.mensaje}</Text>
          <View style={styles.resultActions}>
            {esExito ? (
              <TouchableOpacity
                style={styles.secondaryModalButton}
                onPress={onClose}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryModalButtonText}>Cerrar</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.primaryModalButton}
              onPress={esExito ? onViewEvent : onClose}
              accessibilityRole="button"
            >
              <Text style={styles.primaryModalButtonText}>
                {esExito ? 'Ver evento' : 'Cerrar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    padding: 24,
  },
  resultModal: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderColor: COLORS.borderGlass,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  resultIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successIcon: {
    backgroundColor: COLORS.statusSuccess,
  },
  failureIcon: {
    backgroundColor: COLORS.statusDanger,
  },
  resultTitle: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultMessage: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  resultActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  primaryModalButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.accentElectric,
    borderRadius: 22,
    paddingHorizontal: 12,
  },
  primaryModalButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryModalButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 22,
    paddingHorizontal: 12,
  },
  secondaryModalButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
