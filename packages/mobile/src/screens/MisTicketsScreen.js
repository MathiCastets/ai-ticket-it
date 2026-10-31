import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import useMockLoading from '../hooks/useMockLoading';
import { TicketListSkeleton } from '../components/loading/Skeletons';
import LoadingSpinner from '../components/loading/Spinners';

export default function MisTicketsScreen({ navigation }) {
  const { compras, currentUser, getDiasRestantes, cancelarCompra, marcarEntradaUtilizada } = useApp();
  const isLoading = useMockLoading();

  const [activeTab, setActiveTab] = useState('todas'); // 'todas' | 'confirmadas' | 'pendientes' | 'historial'
  const [selectedCompraQR, setSelectedCompraQR] = useState(null);
  const [selectedCompraCancel, setSelectedCompraCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [checkInLoadingId, setCheckInLoadingId] = useState(null);

  // Filter purchases by tab
  const comprasDelUsuario = compras.filter((compra) => compra.compradorId === currentUser.id);
  const filteredCompras = comprasDelUsuario.filter((c) => {
    if (activeTab === 'confirmadas') return c.estado === 'CONFIRMADA';
    if (activeTab === 'pendientes') return c.estado === 'PENDIENTE';
    if (activeTab === 'historial') return c.estado === 'UTILIZADA' || c.estado === 'REEMBOLSADA' || c.estado === 'CANCELADA';
    return true;
  });

  const handleConfirmCancel = async () => {
    if (!selectedCompraCancel) return;
    setIsCancelling(true);
    try {
      const res = await cancelarCompra(selectedCompraCancel.id);
      if (!res.success) throw new Error(res.error || 'No se pudo cancelar la compra.');
      setSelectedCompraCancel(null);
      Alert.alert('Cancelación Exitosa', res.mensaje);
    } catch (error) {
      Alert.alert('No se pudo cancelar', error.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSimularUso = async (compraId) => {
    setCheckInLoadingId(compraId);
    try {
      const res = await marcarEntradaUtilizada(compraId);
      if (!res.success) throw new Error(res.error || 'No se pudo acreditar la entrada.');
      Alert.alert('Entrada Acreditada', 'Se ha marcado la entrada como UTILIZADA. ¡Ahora puedes calificar el evento!');
    } catch (error) {
      Alert.alert('No se pudo acreditar', error.message);
    } finally {
      setCheckInLoadingId(null);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Mis Tickets" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Overview */}
        <View style={styles.headerInfo}>
          <View>
            <Text style={styles.pageTitle}>Mis Compras</Text>
            <Text style={styles.pageSubtitle}>Gestioná tus accesos, estados y cancelaciones</Text>
          </View>
          <View style={styles.ticketCountBadge}>
            <Ionicons name="ticket" size={20} color={COLORS.accentElectric} />
          </View>
        </View>

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {[
            { id: 'todas', label: `Todas (${comprasDelUsuario.length})` },
            {
              id: 'confirmadas',
              label: `Confirmadas (${comprasDelUsuario.filter((c) => c.estado === 'CONFIRMADA').length})`,
            },
            {
              id: 'pendientes',
              label: `Pendientes (${comprasDelUsuario.filter((c) => c.estado === 'PENDIENTE').length})`,
            },
            {
              id: 'historial',
              label: `Historial (${comprasDelUsuario.filter((c) => ['UTILIZADA', 'REEMBOLSADA', 'CANCELADA'].includes(c.estado)).length})`,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Purchases List */}
        <View style={styles.ticketList}>
          {isLoading ? (
            <TicketListSkeleton />
          ) : filteredCompras.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No hay compras en esta sección</Text>
              <Text style={styles.emptySubtitle}>Explorá los eventos disponibles y reservá tus entradas.</Text>
            </View>
          ) : (
            filteredCompras.map((compra) => {
              const dias = getDiasRestantes(compra.eventoFecha);
              const isConfirmada = compra.estado === 'CONFIRMADA';
              const isUtilizada = compra.estado === 'UTILIZADA';
              const isPendiente = compra.estado === 'PENDIENTE';

              const statusColor = isConfirmada
                ? COLORS.statusSuccess
                : isUtilizada
                ? COLORS.secondary
                : isPendiente
                ? COLORS.statusWarning
                : COLORS.statusDanger;

              return (
                <View key={compra.id} style={styles.ticketCard}>
                  {/* Card Media Header */}
                  <View style={styles.cardImageContainer}>
                    <Image source={{ uri: compra.imagen || compra.evento?.imagen }} style={styles.cardImage} />
                    <View style={styles.cardImageOverlay} />

                    {/* Top Badges */}
                    <View style={styles.cardTopRow}>
                      <View style={[styles.statusChip, { backgroundColor: 'rgba(15, 8, 29, 0.85)' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusChipText, { color: statusColor }]}>{compra.estado}</Text>
                      </View>
                      <Text style={styles.orderCode}>{compra.ordenCodigo}</Text>
                    </View>

                    {/* Countdown Pill (Key TP Requirement) */}
                    {isConfirmada && (
                      <View style={styles.countdownPill}>
                        <Ionicons name="time" size={14} color={COLORS.badgeCyanGlow} />
                        <Text style={styles.countdownText}>
                          {dias > 0 ? `¡Faltan ${dias} días para el evento!` : '¡El evento es hoy!'}
                        </Text>
                      </View>
                    )}
                  </View>

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
                      <Text style={styles.detailText}>
                        Organiza: {compra.organizadorNombre || (typeof compra.evento?.organizador === 'object' ? compra.evento.organizador.nombre : compra.evento?.organizador) || 'Organizador'}
                      </Text>
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.actionsRow}>
                      {/* View QR (if Confirmada) */}
                      {isConfirmada && (
                        <TouchableOpacity
                          style={styles.actionBtnSecondary}
                          onPress={() => setSelectedCompraQR(compra)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="qr-code-outline" size={15} color={COLORS.badgeCyanGlow} />
                          <Text style={styles.actionBtnSecondaryText}>Ver QR</Text>
                        </TouchableOpacity>
                      )}

                      {/* Chat with organizer (TP Requirement) */}
                      <TouchableOpacity
                        style={styles.actionBtnChat}
                        onPress={() => navigation.navigate('Chat', { compraId: compra.id })}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={15} color={COLORS.accentElectric} />
                        <Text style={styles.actionBtnChatText}>Chat ({compra.mensajes?.length || 0})</Text>
                      </TouchableOpacity>

                      {/* Cancel / Refund Button (TP Requirement) */}
                      {isConfirmada && (
                        <TouchableOpacity
                          style={styles.actionBtnCancel}
                          onPress={() => setSelectedCompraCancel(compra)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="close-circle-outline" size={15} color={COLORS.statusDanger} />
                          <Text style={styles.actionBtnCancelText}>Cancelar</Text>
                        </TouchableOpacity>
                      )}

                      {/* Rate event if UTILIZADA (TP Requirement) */}
                      {isUtilizada && (
                        <TouchableOpacity
                          style={styles.actionBtnRate}
                          onPress={() => navigation.navigate('Calificar', { compraId: compra.id })}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="star" size={14} color={COLORS.statusWarning} />
                          <Text style={styles.actionBtnRateText}>
                            {compra.reseniaRealizada ? 'Ver Calificación' : 'Calificar Evento'}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Quick button to simulate check-in (Acreditar) */}
                      {isConfirmada && (
                        <TouchableOpacity
                          style={styles.actionBtnCheckIn}
                          onPress={() => handleSimularUso(compra.id)}
                          disabled={checkInLoadingId === compra.id}
                          activeOpacity={0.7}
                        >
                          {checkInLoadingId === compra.id ? (
                            <LoadingSpinner size={16} style={styles.actionSpinner} />
                          ) : (
                            <>
                              <Ionicons name="checkmark-done" size={14} color={COLORS.secondary} />
                              <Text style={styles.actionBtnCheckInText}>Acreditar</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      {selectedCompraQR && (
        <Modal transparent animationType="fade" visible={!!selectedCompraQR}>
          <View style={styles.modalBackdrop}>
            <View style={styles.qrModalCard}>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedCompraQR(null)}>
                <Ionicons name="close" size={20} color={COLORS.textPrimary} />
              </TouchableOpacity>

              <View style={styles.qrIconCircle}>
                <Ionicons name="qr-code" size={26} color={COLORS.badgeCyanGlow} />
              </View>

              <Text style={styles.qrEventTitle}>{selectedCompraQR.eventoNombre}</Text>
              <Text style={styles.qrSubtitle}>
                {selectedCompraQR.cantidad}x {selectedCompraQR.tipoEntradaNombre} • {selectedCompraQR.ordenCodigo}
              </Text>

              {/* Realistic QR Container Box */}
              <View style={styles.qrWhiteBox}>
                <Ionicons name="qr-code" size={160} color="#0F081D" />
              </View>

              <View style={styles.qrVerifiedRow}>
                <View style={styles.greenPulse} />
                <Text style={styles.qrVerifiedText}>Entrada digital válida para acreditar</Text>
              </View>

              <Text style={styles.qrDoorText}>Mostrá este código en el acceso norte del predio.</Text>
            </View>
          </View>
        </Modal>
      )}

      {/* Cancellation Modal (TP Requirement) */}
      {selectedCompraCancel && (
        <Modal transparent animationType="fade" visible={!!selectedCompraCancel}>
          <View style={styles.modalBackdrop}>
            <View style={styles.cancelModalCard}>
              <View style={styles.cancelDangerIcon}>
                <Ionicons name="alert-circle" size={32} color={COLORS.statusDanger} />
              </View>

              <Text style={styles.cancelTitle}>¿Cancelar compra y solicitar reembolso?</Text>
              <Text style={styles.cancelSubtitle}>
                Estás por solicitar la cancelación de la orden <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>{selectedCompraCancel.ordenCodigo}</Text> ({selectedCompraCancel.eventoNombre}).
              </Text>

              <View style={styles.cancelInfoBox}>
                <View style={styles.cancelInfoRow}>
                  <Text style={styles.cancelInfoLabel}>Total pagado:</Text>
                  <Text style={styles.cancelInfoValue}>${selectedCompraCancel.total?.toLocaleString('es-AR')}</Text>
                </View>
                <View style={styles.cancelInfoRow}>
                  <Text style={styles.cancelInfoLabel}>Reembolso estimado:</Text>
                  <Text style={[styles.cancelInfoValue, { color: COLORS.statusSuccess }]}>100% (${selectedCompraCancel.total?.toLocaleString('es-AR')})</Text>
                </View>
                <Text style={styles.cancelPolicyText}>✓ Cumple con la política del TP: Entrada no utilizada y evento no realizado.</Text>
              </View>

              <View style={styles.cancelBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBackBtn}
                  onPress={() => setSelectedCompraCancel(null)}
                  disabled={isCancelling}
                >
                  <Text style={styles.cancelBackBtnText}>Volver</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelConfirmBtn}
                  onPress={handleConfirmCancel}
                  disabled={isCancelling}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  ticketCountBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 127, 0.25)',
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tabButtonActive: {
    backgroundColor: COLORS.primaryContainer,
    borderColor: COLORS.primary,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabButtonTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  ticketList: {
    paddingHorizontal: 16,
    gap: 16,
    marginTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 240,
  },
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
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 8, 29, 0.4)',
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
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  countdownPill: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 30, 109, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(32, 217, 249, 0.4)',
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
  },
  actionBtnChat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnChatText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentElectric,
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
  actionBtnCheckIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
  },
  actionBtnCheckInText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.secondary,
  },
  actionSpinner: {
    width: 18,
    padding: 0,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 8, 29, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
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
  qrDoorText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  cancelModalCard: {
    width: '100%',
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
});
