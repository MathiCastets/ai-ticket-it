import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { commonStyles } from '../../theme/commonStyles';
import LoadingSpinner from '../loading/Spinners';

export default function CancelCompraModal({ compra, isCancelling, onClose, onConfirm }) {
  if (!compra) return null;

  const isPendiente = compra.estado === 'PENDIENTE';

  return (
    <Modal
      transparent
      animationType="fade"
      visible={!!compra}
      onRequestClose={() => !isCancelling && onClose()}
    >
      <View style={commonStyles.modalBackdrop}>
        <View style={styles.cancelModalCard} accessibilityViewIsModal={true}>
          <View style={styles.cancelDangerIcon}>
            <Ionicons name="alert-circle" size={32} color={COLORS.statusDanger} />
          </View>

          <Text style={styles.cancelTitle}>
            {isPendiente
              ? '¿Cancelar compra pendiente?'
              : '¿Cancelar compra y solicitar reembolso?'}
          </Text>
          <Text style={styles.cancelSubtitle}>
            {isPendiente
              ? 'Estás por cancelar la orden '
              : 'Estás por solicitar la cancelación de la orden '}
            <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>
              {compra.ordenCodigo}
            </Text>{' '}
            ({compra.eventoNombre}).
          </Text>

          <View style={styles.cancelInfoBox}>
            <View style={styles.cancelInfoRow}>
              <Text style={styles.cancelInfoLabel}>
                {isPendiente ? 'Total de la compra:' : 'Total pagado:'}
              </Text>
              <Text style={styles.cancelInfoValue}>${compra.total?.toLocaleString('es-AR')}</Text>
            </View>
            <View style={styles.cancelInfoRow}>
              <Text style={styles.cancelInfoLabel}>
                {isPendiente ? 'Reembolso:' : 'Reembolso estimado:'}
              </Text>
              <Text style={[styles.cancelInfoValue, { color: COLORS.statusSuccess }]}>
                {isPendiente
                  ? 'No aplica'
                  : `100% ($${compra.total?.toLocaleString('es-AR')})`}
              </Text>
            </View>
            <Text style={styles.cancelPolicyText}>
              {isPendiente
                ? 'La compra pendiente se cancelará sin generar un reembolso.'
                : '✓ Cumple con la política de devolución.'}
            </Text>
          </View>

          <View style={styles.cancelBtnRow}>
            <TouchableOpacity
              style={styles.cancelBackBtn}
              onPress={onClose}
              disabled={isCancelling}
              accessibilityRole="button"
              accessibilityState={{ disabled: isCancelling }}
            >
              <Text style={styles.cancelBackBtnText}>Volver</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelConfirmBtn}
              onPress={onConfirm}
              disabled={isCancelling}
              accessibilityRole="button"
              accessibilityState={{ disabled: isCancelling }}
            >
              {isCancelling ? (
                <LoadingSpinner size={18} style={styles.actionSpinner} />
              ) : (
                <Text style={styles.cancelConfirmBtnText}>Confirmar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  cancelModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelDangerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 51, 102, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cancelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cancelSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginTop: 6,
  },
  cancelInfoBox: {
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 12,
    borderRadius: 10,
    marginTop: 14,
    marginBottom: 18,
    gap: 4,
  },
  cancelInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelInfoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  cancelInfoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cancelPolicyText: {
    fontSize: 10,
    color: COLORS.tertiary,
    marginTop: 6,
  },
  cancelBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBackBtn: {
    flex: 1,
    backgroundColor: COLORS.surfaceContainer,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  cancelBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  cancelConfirmBtn: {
    flex: 1,
    backgroundColor: COLORS.statusDanger,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  cancelConfirmBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  actionSpinner: {
    width: 18,
    padding: 0,
  },
});
