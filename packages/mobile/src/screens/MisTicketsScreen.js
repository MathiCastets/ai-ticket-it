import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import { TicketListSkeleton } from '../components/loading/Skeletons';
import LoadingSpinner from '../components/loading/Spinners';
import AccessDeniedView from '../components/AccessDeniedView';
import { useNotification } from '../components/NotificationProvider';

const normalizarTexto = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

const obtenerNombreCategoria = (categoria) =>
  typeof categoria === 'object' && categoria !== null
    ? categoria.nombre || ''
    : categoria || '';

export default function MisTicketsScreen({ navigation }) {
  const {
    compras,
    comprasCargando,
    eventos,
    currentUser,
    getDiasRestantes,
    cancelarCompra,
  } = useApp();
  const { notify } = useNotification();

  const [activeTab, setActiveTab] = useState('todas');
  const [busqueda, setBusqueda] = useState('');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedCompraQR, setSelectedCompraQR] = useState(null);
  const [selectedCompraCancel, setSelectedCompraCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  if (currentUser?.rol === 'organizador') {
    return (
      <AccessDeniedView
        headerTitle="Mis Tickets"
        headerSubtitle="Acceso Restringido"
        actionText="Ir a Eventos"
        onBack={() => navigation.navigate('MainTabs')}
        navigation={navigation}
      />
    );
  }

  const comprasDelUsuario = compras.filter((compra) => compra.compradorId === currentUser.id);
  const obtenerCategoriaCompra = (compra) => {
    const evento = eventos.find((item) => item.id === compra.eventoId);
    return obtenerNombreCategoria(
      compra.categoria || compra.evento?.categoria || evento?.categoria
    );
  };
  const textoBusqueda = normalizarTexto(busqueda.trim());
  const filteredCompras = comprasDelUsuario
    .filter((compra) => {
      if (activeTab === 'confirmadas' && compra.estado !== 'CONFIRMADA') return false;
      if (activeTab === 'pendientes' && compra.estado !== 'PENDIENTE') return false;
      if (activeTab === 'utilizadas' && compra.estado !== 'UTILIZADA') return false;
      if (activeTab === 'reembolsadas' && compra.estado !== 'REEMBOLSADA') return false;

      if (!textoBusqueda) return true;
      return normalizarTexto(
        `${compra.eventoNombre || compra.evento?.nombre || ''} ${
          compra.ubicacion || compra.evento?.ubicacion || ''
        } ${obtenerCategoriaCompra(compra)}`
      ).includes(textoBusqueda);
    })
    .sort((compraA, compraB) => {
      const fechaA = Date.parse(compraA.fechaHora || '');
      const fechaB = Date.parse(compraB.fechaHora || '');
      const fechaValidaA = Number.isFinite(fechaA);
      const fechaValidaB = Number.isFinite(fechaB);

      if (!fechaValidaA || !fechaValidaB) {
        if (fechaValidaA === fechaValidaB) return 0;
        return fechaValidaA ? -1 : 1;
      }
      return (fechaA - fechaB) * (sortDirection === 'asc' ? 1 : -1);
    });

  const handleConfirmCancel = async () => {
    if (!selectedCompraCancel) return;
    setIsCancelling(true);
    try {
      const res = await cancelarCompra(selectedCompraCancel.id);
      if (!res.success) throw new Error(res.error || 'No se pudo cancelar la compra.');
      setSelectedCompraCancel(null);
      notify({ title: 'Cancelación exitosa', message: res.mensaje, type: 'success' });
    } catch (error) {
      notify({ title: 'No se pudo cancelar', message: error.message, type: 'error' });
    } finally {
      setIsCancelling(false);
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
            {/*<Text style={styles.pageSubtitle}>Gestioná tus accesos, estados y cancelaciones</Text>*/}
          </View>
        </View>

        <View style={styles.filters}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, lugar o categoría..."
              placeholderTextColor={COLORS.textMuted}
              value={busqueda}
              onChangeText={setBusqueda}
              returnKeyType="search"
              accessibilityLabel="Buscar tickets por nombre, lugar o categoría"
            />
            {busqueda.length > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Limpiar búsqueda"
                onPress={() => setBusqueda('')}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.sortSection}>
            <Text style={styles.eventCount}>
              {filteredCompras.length} {filteredCompras.length === 1 ? 'ticket' : 'tickets'}
            </Text>
            <TouchableOpacity
              style={styles.sortPill}
              onPress={() => setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))}
              accessibilityRole="button"
              accessibilityLabel={`Ordenar por fecha de compra ${sortDirection === 'asc' ? 'ascendente' : 'descendente'}`}
              accessibilityHint="Toca para invertir el orden"
              hitSlop={4}
            >
              <Text style={styles.sortPillText}>Fecha</Text>
              <MaterialIcons
                name={sortDirection === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                size={14}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          {[
            { id: 'todas', label: 'Todas', count: comprasDelUsuario.length },
            {
              id: 'confirmadas',
              label: 'Confirmadas',
              count: comprasDelUsuario.filter((c) => c.estado === 'CONFIRMADA').length,
            },
            {
              id: 'pendientes',
              label: 'Pendientes',
              count: comprasDelUsuario.filter((c) => c.estado === 'PENDIENTE').length,
            },
            {
              id: 'utilizadas',
              label: 'Utilizadas',
              count: comprasDelUsuario.filter((c) => c.estado === 'UTILIZADA').length,
            },
            {
              id: 'reembolsadas',
              label: 'Reembolsadas',
              count: comprasDelUsuario.filter((c) => c.estado === 'REEMBOLSADA').length,
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab.id)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabCountBadge, isActive && styles.tabCountBadgeActive]}>
                  <Text style={[styles.tabCount, isActive && styles.tabCountActive]}>
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Purchases List */}
        <View style={styles.ticketList}>
          {comprasCargando ? (
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
                      <View style={[styles.statusChip, { backgroundColor: 'rgba(15, 8, 29, 0.85)' }]}>
                        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                        <Text style={[styles.statusChipText, { color: statusColor }]}>{compra.estado}</Text>
                      </View>
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
                      <Text style={styles.detailText}>
                        Organiza: {compra.organizadorNombre || (typeof compra.evento?.organizador === 'object' ? compra.evento.organizador.nombre : compra.evento?.organizador) || 'Organizador'}
                      </Text>
                    </View>

                    {/* Action Buttons Row */}
                    <View style={styles.actionsRow}>
                      {/* View QR (if Confirmada) */}
                      {isConfirmada && (
                        <TouchableOpacity
                          style={styles.actionBtnQr}
                          onPress={() => setSelectedCompraQR(compra)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="qr-code-outline" size={15} color={COLORS.background} />
                          <Text style={styles.actionBtnQrText}>Ver QR</Text>
                        </TouchableOpacity>
                      )}

                      {/* Chat with organizer (TP Requirement) */}
                      <TouchableOpacity
                        style={styles.actionBtnChat}
                        onPress={() => navigation.navigate('Chat', { compraId: compra.id })}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="chatbubble-ellipses-outline" size={15} color={COLORS.badgeCyanGlow} />
                        <Text style={styles.actionBtnChatText}>Chat</Text>
                      </TouchableOpacity>

                      {/* Cancel / Refund Button (TP Requirement) */}
                      {(isConfirmada || isPendiente) && (
                        <TouchableOpacity
                          style={styles.actionBtnCancel}
                          onPress={() => setSelectedCompraCancel(compra)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.actionBtnCancelText}>
                            <Ionicons name="close-circle-outline" size={15} color={COLORS.statusDanger} />
                            {' '}Cancelar
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Rate event if UTILIZADA (TP Requirement) */}
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
                            onPress={() => navigation.navigate('Calificar', { compraId: compra.id })}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="star" size={14} color={COLORS.statusWarning} />
                            <Text style={styles.actionBtnRateText}>Calificar Evento</Text>
                          </TouchableOpacity>
                        ))}

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

              <Text style={styles.cancelTitle}>
                {selectedCompraCancel.estado === 'PENDIENTE'
                  ? '¿Cancelar compra pendiente?'
                  : '¿Cancelar compra y solicitar reembolso?'}
              </Text>
              <Text style={styles.cancelSubtitle}>
                {selectedCompraCancel.estado === 'PENDIENTE'
                  ? 'Estás por cancelar la orden '
                  : 'Estás por solicitar la cancelación de la orden '}
                <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>
                  {selectedCompraCancel.ordenCodigo}
                </Text>{' '}
                ({selectedCompraCancel.eventoNombre}).
              </Text>

              <View style={styles.cancelInfoBox}>
                <View style={styles.cancelInfoRow}>
                  <Text style={styles.cancelInfoLabel}>
                    {selectedCompraCancel.estado === 'PENDIENTE' ? 'Total de la compra:' : 'Total pagado:'}
                  </Text>
                  <Text style={styles.cancelInfoValue}>${selectedCompraCancel.total?.toLocaleString('es-AR')}</Text>
                </View>
                <View style={styles.cancelInfoRow}>
                  <Text style={styles.cancelInfoLabel}>
                    {selectedCompraCancel.estado === 'PENDIENTE'
                      ? 'Reembolso:'
                      : 'Reembolso estimado:'}
                  </Text>
                  <Text style={[styles.cancelInfoValue, { color: COLORS.statusSuccess }]}>
                    {selectedCompraCancel.estado === 'PENDIENTE'
                      ? 'No aplica'
                      : `100% ($${selectedCompraCancel.total?.toLocaleString('es-AR')})`}
                  </Text>
                </View>
                <Text style={styles.cancelPolicyText}>
                  {selectedCompraCancel.estado === 'PENDIENTE'
                    ? 'La compra pendiente se cancelará sin generar un reembolso.'
                    : '✓ Cumple con la política de devolución.'}
                </Text>
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
  filters: {
    gap: 10,
    paddingHorizontal: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    gap: 9,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventCount: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  sortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  sortPillText: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  tabButtonActive: {
    backgroundColor: COLORS.accentElectric,
    borderColor: COLORS.accentElectric,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
  },
  tabButtonTextActive: {
    color: COLORS.textPrimary,
  },
  tabCountBadge: {
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabCount: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  tabCountActive: {
    color: COLORS.textPrimary,
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
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
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
