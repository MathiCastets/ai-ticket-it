import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import useMockLoading from '../hooks/useMockLoading';
import LoadingSpinner from '../components/loading/Spinners';

export default function PanelVentasScreen({ route, navigation }) {
  const { eventos, compras, currentUser } = useApp();
  const isLoading = useMockLoading();
  const eventosDelUsuario = eventos.filter((evento) => evento.organizadorId === currentUser.id);
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    const intervalId = setInterval(() => setAhora(Date.now()), 60000);
    return () => clearInterval(intervalId);
  }, []);

  const [selectedEventoId, setSelectedEventoId] = useState(
    route?.params?.eventoId || (eventosDelUsuario.length > 0 ? eventosDelUsuario[0].id : null)
  );
  useEffect(() => {
    if (route?.params?.eventoId) setSelectedEventoId(route.params.eventoId);
  }, [route?.params?.eventoId]);

  const selectedEvento =
    eventosDelUsuario.find((evento) => evento.id === selectedEventoId) || eventosDelUsuario[0];

  // Purchases associated with this specific event (TP requirement)
  const comprasDelEvento = useMemo(() => {
    if (!selectedEvento) return [];
    return compras.filter((c) => (c.eventoId || c.evento?.id) === selectedEvento.id);
  }, [selectedEvento, compras]);

  // Aggregate metrics
  const metricas = useMemo(() => {
    if (!selectedEvento) {
      return { totalRecaudado: 0, ingresosUltimas24Horas: 0, vendidas: 0, cupoTotal: 0 };
    }

    const totalRecaudado = comprasDelEvento
      .filter((c) => c.estado !== 'CANCELADA' && c.estado !== 'REEMBOLSADA')
      .reduce((acc, c) => acc + (c.total || 0), 0);

    const limite24Horas = ahora - 24 * 60 * 60 * 1000;
    const ingresosUltimas24Horas = comprasDelEvento
      .filter((compra) => {
        if (!['CONFIRMADA', 'UTILIZADA'].includes(compra.estado)) return false;
        const fechaCompra = Date.parse(compra.fechaHora);
        return Number.isFinite(fechaCompra) && fechaCompra >= limite24Horas && fechaCompra <= ahora;
      })
      .reduce((acumulado, compra) => acumulado + (compra.total || 0), 0);

    const vendidas = comprasDelEvento
      .filter((c) => c.estado !== 'CANCELADA' && c.estado !== 'REEMBOLSADA')
      .reduce((acc, c) => acc + (c.cantidad || 0), 0);

    const cupoTotal = selectedEvento.tiposEntrada?.reduce((acc, t) => acc + t.cupo, 0) || 0;

    return { totalRecaudado, ingresosUltimas24Horas, vendidas, cupoTotal };
  }, [selectedEvento, comprasDelEvento, ahora]);

  if (isLoading) {
    return (
      <View style={styles.screenContainer}>
        <Header title="AI Ticket It" subtitle="Panel de Ventas" showBack onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <LoadingSpinner variant="dual" label="Cargando ventas del evento..." />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Panel de Ventas" showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Event Selector Horizontal Chips */}
        <View style={styles.selectorSection}>
          <Text style={styles.selectorLabel}>SELECCIONAR EVENTO:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
            {eventosDelUsuario.map((ev) => {
              const isSelected = selectedEvento?.id === ev.id;
              return (
                <TouchableOpacity
                  key={ev.id}
                  style={[styles.eventChip, isSelected && styles.eventChipSelected]}
                  onPress={() => setSelectedEventoId(ev.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.eventChipText, isSelected && styles.eventChipTextSelected]}>
                    {ev.nombre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Event Card Banner */}
        {selectedEvento && (
          <View style={styles.eventBannerCard}>
            <View style={styles.bannerRow}>
              <View style={styles.bannerIconBox}>
                <Ionicons name="stats-chart" size={24} color={COLORS.badgeCyanGlow} />
              </View>
              <View style={styles.bannerTextBox}>
                <View style={styles.liveBadgeRow}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>PANEL EN VIVO</Text>
                </View>
                <Text style={styles.bannerTitle}>{selectedEvento.nombre}</Text>
                <Text style={styles.bannerSub}>{selectedEvento.fechaTexto}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Bento Metrics (Recaudado & Vendidas) */}
        <View style={styles.metricsGrid}>
          {/* KPI: Recaudación */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Ionicons name="cash-outline" size={16} color={COLORS.statusSuccess} />
              <Text style={styles.kpiLabel}>TOTAL RECAUDADO</Text>
            </View>
            <View style={styles.revenueValueRow}>
              <Feather name="trending-up" size={19} color={COLORS.statusSuccess} />
              <Text style={styles.kpiValue}>
                ${metricas.totalRecaudado.toLocaleString('es-AR')}
              </Text>
            </View>
            <Text style={styles.revenueRecentValue}>
              +${metricas.ingresosUltimas24Horas.toLocaleString('es-AR')} hoy
            </Text>
          </View>

          {/* KPI: Entradas vendidas */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiHeader}>
              <Ionicons name="ticket-outline" size={16} color={COLORS.tertiary} />
              <Text style={styles.kpiLabel}>ENTRADAS VENDIDAS</Text>
            </View>
            <Text style={styles.kpiValue}>
              {metricas.vendidas} / {metricas.cupoTotal}
            </Text>
            <View style={styles.kpiTrend}>
              <Text style={styles.kpiTrendText}>
                Cupos restantes:{' '}
                {selectedEvento?.tiposEntrada?.reduce((acc, t) => acc + t.disponibles, 0) || 0}
              </Text>
            </View>
          </View>
        </View>

        {/* Ticket Types Breakdown with Remaining Quota (TP Requirement) */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionHeading}>Disponibilidad por Tipo de Entrada</Text>
          <Text style={styles.sectionSubheading}>
            Control de cupos restantes por categoría para este evento:
          </Text>

          {selectedEvento?.tiposEntrada?.map((tipo) => {
            const porcentaje = Math.round(((tipo.cupo - tipo.disponibles) / tipo.cupo) * 100);
            return (
              <View key={tipo.id} style={styles.breakdownCard}>
                <View style={styles.breakdownHeader}>
                  <Text style={styles.breakdownTitle}>{tipo.nombre}</Text>
                  <Text style={styles.breakdownPrice}>${tipo.precio.toLocaleString('es-AR')}</Text>
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${porcentaje}%` }]} />
                </View>

                <View style={styles.breakdownFooter}>
                  <Text style={styles.breakdownMeta}>
                    Vendidas: {tipo.cupo - tipo.disponibles} ({porcentaje}%)
                  </Text>
                  <Text
                    style={[
                      styles.breakdownRemaining,
                      { color: tipo.disponibles > 10 ? COLORS.statusSuccess : COLORS.statusWarning },
                    ]}
                  >
                    Quedan {tipo.disponibles} cupos
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Associated Purchases List (TP Requirement) */}
        <View style={styles.cardSection}>
          <View style={styles.salesHeader}>
            <Text style={styles.sectionHeading}>Compras Asociadas</Text>
            <Text style={styles.salesCountBadge}>{comprasDelEvento.length} órdenes</Text>
          </View>

          {comprasDelEvento.length === 0 ? (
            <Text style={styles.noSalesText}>Aún no se han registrado compras para este evento.</Text>
          ) : (
            comprasDelEvento.map((compra) => {
              const isConfirmada = compra.estado === 'CONFIRMADA';
              const isUtilizada = compra.estado === 'UTILIZADA';
              const statusColor = isConfirmada
                ? COLORS.statusSuccess
                : isUtilizada
                ? COLORS.secondary
                : COLORS.statusDanger;

              return (
                <View key={compra.id} style={styles.saleItemCard}>
                  <View style={styles.saleItemLeft}>
                    <View style={styles.buyerAvatar}>
                      <Ionicons name="person" size={16} color={COLORS.badgeCyanGlow} />
                    </View>
                    <View>
                      <Text style={styles.buyerName}>
                        {compra.compradorNombre || (typeof compra.comprador === 'object' ? `${compra.comprador?.nombre || ''} ${compra.comprador?.apellido || ''}`.trim() : compra.comprador) || 'Comprador'}
                      </Text>
                      <Text style={styles.saleDetails}>
                        {compra.cantidad}x {compra.tipoEntradaNombre || compra.tipoEntrada?.nombre} • ${compra.total?.toLocaleString('es-AR')}
                      </Text>
                      <Text style={styles.saleOrderCode}>{compra.ordenCodigo}</Text>
                    </View>
                  </View>

                  <View style={styles.saleItemRight}>
                    <View style={[styles.saleStatusChip, { borderColor: statusColor }]}>
                      <Text style={[styles.saleStatusText, { color: statusColor }]}>
                        {compra.estado}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.chatBuyerBtn}
                      onPress={() => navigation.navigate('Chat', { compraId: compra.id })}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chatbubble-ellipses" size={14} color={COLORS.accentElectric} />
                      <Text style={styles.chatBuyerBtnText}>Chat</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  selectorSection: {
    gap: 6,
  },
  selectorLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  selectorScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  eventChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  eventChipSelected: {
    backgroundColor: COLORS.secondaryContainer,
    borderColor: COLORS.primaryContainer,
  },
  eventChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  eventChipTextSelected: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  eventBannerCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceCardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextBox: {
    flex: 1,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.statusSuccess,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.badgeCyanGlow,
    letterSpacing: 0.5,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  bannerSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceCard,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  revenueValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  revenueRecentValue: {
    color: COLORS.statusSuccess,
    fontSize: 12,
    fontWeight: '700',
  },
  kpiTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiTrendText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  cardSection: {
    backgroundColor: COLORS.surfaceCard,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubheading: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  breakdownCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 12,
    borderRadius: 12,
    gap: 6,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  breakdownPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.tertiary,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.surfaceContainerHighest,
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accentElectric,
  },
  breakdownFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownMeta: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  breakdownRemaining: {
    fontSize: 11,
    fontWeight: '700',
  },
  salesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  salesCountBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  noSalesText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  saleItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  saleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  buyerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saleDetails: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  saleOrderCode: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  saleItemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  saleStatusChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  saleStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  chatBuyerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chatBuyerBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.accentElectric,
  },
});
