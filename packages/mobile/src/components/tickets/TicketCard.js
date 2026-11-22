import React from 'react';
import { StyleSheet, View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../theme/colors';
import EstadoCompraBadge from '../EstadoCompraBadge';

export default function TicketCard({
  compra,
  dias,
  onOpenQr,
  onOpenChat,
  onRequestCancel,
  onRate,
}) {
  const isConfirmada = compra.estado === 'CONFIRMADA';
  const isUtilizada = compra.estado === 'UTILIZADA';
  const isPendiente = compra.estado === 'PENDIENTE';

  const organizadorNombre =
    compra.organizadorNombre ||
    (typeof compra.evento?.organizador === 'object'
      ? compra.evento.organizador?.nombre
      : compra.evento?.organizador) ||
    'Organizador';

  return (
    <View style={styles.ticketCard}>
      {/* Card Media Header */}
      <View style={styles.cardImageContainer}>
        <Image
          source={compra.imagen || compra.evento?.imagen ? { uri: compra.imagen || compra.evento?.imagen } : null}
          style={styles.cardImage}
        />
        <LinearGradient
          colors={['rgba(15, 8, 29, 0.65)', 'rgba(15, 8, 29, 0)']}
          style={styles.cardImageScrim}
          pointerEvents="none"
        />

        {/* Top Badges */}
        <View style={styles.cardTopRow}>
          <EstadoCompraBadge estado={compra.estado} />
          <Text style={styles.orderCode}>{compra.ordenCodigo}</Text>
        </View>
      </View>

      {isConfirmada ? (
        <View style={styles.countdownBar}>
          <Ionicons name="time" size={14} color={COLORS.badgeCyanGlow} />
          <Text style={styles.countdownText}>
            {dias > 0
              ? dias === 1
                ? '¡Falta 1 día para el evento!'
                : `¡Faltan ${dias} días para el evento!`
              : '¡El evento es hoy!'}
          </Text>
        </View>
      ) : null}

      {/* Card Content */}
      <View style={styles.cardBody}>
        <Text style={styles.eventTitle}>{compra.eventoNombre || compra.evento?.nombre}</Text>
        <Text style={styles.ticketInfo}>
          {compra.cantidad}x {compra.tipoEntradaNombre || compra.tipoEntrada?.nombre} • Total: ${compra.total?.toLocaleString('es-AR')}
        </Text>

        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.detailText} numberOfLines={1}>
            {compra.ubicacion || compra.evento?.ubicacion}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="business-outline" size={13} color={COLORS.tertiary} />
          <Text style={styles.detailText}>Organiza: {organizadorNombre}</Text>
        </View>

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          {/* View QR (if Confirmada) */}
          {isConfirmada && (
            <TouchableOpacity
              style={styles.actionBtnQr}
              onPress={onOpenQr}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Ionicons name="qr-code-outline" size={15} color={COLORS.background} />
              <Text style={styles.actionBtnQrText}>Ver QR</Text>
            </TouchableOpacity>
          )}

          {/* Chat with organizer */}
          <TouchableOpacity
            style={styles.actionBtnChat}
            onPress={onOpenChat}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={COLORS.badgeCyanGlow} />
            <Text style={styles.actionBtnChatText}>Chat</Text>
          </TouchableOpacity>

          {/* Cancel / Refund Button */}
          {(isConfirmada || isPendiente) && (
            <TouchableOpacity
              style={styles.actionBtnCancel}
              onPress={onRequestCancel}
              activeOpacity={0.7}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnCancelText}>
                <Ionicons name="close-circle-outline" size={15} color={COLORS.statusDanger} />
                {' '}Cancelar
              </Text>
            </TouchableOpacity>
          )}

          {/* Rate event if UTILIZADA */}
          {isUtilizada &&
            (compra.reseniaRealizada ? (
              <View style={styles.ratedChip}>
                <View style={styles.ratedIconCircle}>
                  <Ionicons
                    name="checkmark"
                    size={10}
                    color={COLORS.badgeCyanGlow}
                    style={styles.ratedCheckIcon}
                  />
                </View>
                <Text style={styles.ratedChipText}>Calificada</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.actionBtnRate}
                onPress={onRate}
                activeOpacity={0.7}
                accessibilityRole="button"
              >
                <Ionicons name="star" size={14} color={COLORS.statusWarning} />
                <Text style={styles.actionBtnRateText}>Calificar Evento</Text>
              </TouchableOpacity>
            ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticketCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 72,
  },
  cardTopRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratedIconCircle: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: COLORS.badgeCyanGlow,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ratedCheckIcon: {
    lineHeight: 12,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  orderCode: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    backgroundColor: 'rgba(15, 8, 29, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  countdownBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 30,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(0, 210, 242, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 210, 242, 0.18)',
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
  },
  cardBody: {
    padding: 14,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  ticketInfo: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.tertiary,
    marginTop: 2,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  actionBtnQr: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.badgeCyanGlow,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnQrText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.background,
  },
  actionBtnChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 210, 242, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnChatText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
  },
  actionBtnCancel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 51, 102, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnCancelText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.statusDanger,
  },
  actionBtnRate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 183, 3, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnRateText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.statusWarning,
  },
  ratedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0, 210, 242, 0.14)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ratedChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
  },
});
