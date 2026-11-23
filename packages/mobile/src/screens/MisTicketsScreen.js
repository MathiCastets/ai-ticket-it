import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { commonStyles } from '../theme/commonStyles';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import { TicketListSkeleton } from '../components/loading/Skeletons';
import AccessDeniedView from '../components/AccessDeniedView';
import { useNotification } from '../components/NotificationProvider';
import TicketCard from '../components/tickets/TicketCard';
import TicketQrModal from '../components/tickets/TicketQrModal';
import CancelCompraModal from '../components/tickets/CancelCompraModal';

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
      if (activeTab === 'vencidas' && compra.estado !== 'VENCIDA') return false;
      if (activeTab === 'reembolsadas' && compra.estado !== 'REEMBOLSADA') return false;
      if (activeTab === 'canceladas' && compra.estado !== 'CANCELADA') return false;

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
    <View style={commonStyles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Mis Tickets" />

      <ScrollView style={commonStyles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header Overview */}
        <View style={styles.headerInfo}>
          <View>
            <Text style={styles.pageTitle}>Mis Compras</Text>
            {/*<Text style={styles.pageSubtitle}>Gestioná tus accesos, estados y cancelaciones</Text>*/}
          </View>
        </View>

        <View style={styles.filters}>
          <SearchBar
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar por nombre, lugar o categoría..."
            accessibilityLabel="Buscar tickets por nombre, lugar o categoría"
          />
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
              id: 'vencidas',
              label: 'Vencidas',
              count: comprasDelUsuario.filter((c) => c.estado === 'VENCIDA').length,
            },
            {
              id: 'reembolsadas',
              label: 'Reembolsadas',
              count: comprasDelUsuario.filter((c) => c.estado === 'REEMBOLSADA').length,
            },
            {
              id: 'canceladas',
              label: 'Canceladas',
              count: comprasDelUsuario.filter((c) => c.estado === 'CANCELADA').length,
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
              const tieneFechaEvento =
                Boolean(compra.eventoFecha) && !Number.isNaN(Date.parse(compra.eventoFecha));
              const dias = tieneFechaEvento
                ? getDiasRestantes(compra.eventoFecha)
                : Number.isFinite(compra.diasFaltantes)
                  ? compra.diasFaltantes
                  : 0;

              return (
                <TicketCard
                  key={compra.id}
                  compra={compra}
                  dias={dias}
                  onOpenQr={() => setSelectedCompraQR(compra)}
                  onOpenChat={() => navigation.navigate('Chat', { compraId: compra.id })}
                  onRequestCancel={() => setSelectedCompraCancel(compra)}
                  onRate={() => navigation.navigate('Calificar', { compraId: compra.id })}
                />
              );
            })
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      {selectedCompraQR && (
        <TicketQrModal compra={selectedCompraQR} onClose={() => setSelectedCompraQR(null)} />
      )}

      {/* Cancellation Modal */}
      {selectedCompraCancel && (
        <CancelCompraModal
          compra={selectedCompraCancel}
          isCancelling={isCancelling}
          onClose={() => setSelectedCompraCancel(null)}
          onConfirm={handleConfirmCancel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filters: {
    gap: 10,
    paddingHorizontal: 16,
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
});
