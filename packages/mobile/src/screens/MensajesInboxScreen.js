import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { isConversationClosed, useConversationStatusTime } from '../conversationStatus';
import Header from '../components/Header';
import useMockLoading from '../hooks/useMockLoading';
import { ConversationListSkeleton } from '../components/loading/Skeletons';

const formatearFechaUltimoMensaje = (mensaje) => {
  if (!mensaje?.enviado) return null;

  const fecha = new Date(mensaje.enviado);
  if (Number.isNaN(fecha.getTime())) return null;

  const ahora = new Date();
  const esMismoAnio = fecha.getFullYear() === ahora.getFullYear();
  const esHoy =
    esMismoAnio &&
    fecha.getMonth() === ahora.getMonth() &&
    fecha.getDate() === ahora.getDate();

  if (!esHoy) {
    return fecha.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      ...(esMismoAnio ? {} : { year: 'numeric' }),
    });
  }

  return fecha.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

const normalizarTexto = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

export default function MensajesInboxScreen({ navigation }) {
  const { compras, currentUser } = useApp();
  const isLoading = useMockLoading();
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const ahora = useConversationStatusTime(compras);
  const conversaciones = compras.filter(
    (compra) =>
      compra.compradorId === currentUser.id || compra.organizadorId === currentUser.id
  );
  const conversacionesAgrupadas = Object.values(
    conversaciones.reduce((grupos, compra) => {
      const eventoId =
        compra.eventoId ||
        compra.evento?.id ||
        compra.eventoNombre ||
        compra.evento?.nombre ||
        compra.id;
      const contraparteId =
        currentUser.rol === 'organizador'
          ? compra.compradorId || compra.comprador?.id || compra.compradorNombre
          : compra.organizadorId || compra.evento?.organizador?.id || compra.organizadorNombre;
      const clave = `${eventoId}-${contraparteId}`;
      const ultimoMensaje = compra.mensajes?.[compra.mensajes.length - 1] || null;
      const mensajesNoLeidos = (compra.mensajes || []).filter(
        (mensaje) =>
          mensaje.usuarioId !== currentUser.id &&
          !mensaje.leidoPor?.includes(currentUser.id)
      ).length;
      const cerrada = isConversationClosed(compra, ahora);
      const actividad = Date.parse(ultimoMensaje?.enviado || compra.fechaHora) || 0;
      const grupo =
        grupos[clave] ||
        (grupos[clave] = {
          id: clave,
          compras: [],
          mensajesNoLeidos: 0,
          ultimaActividad: 0,
          ultimaActividadMensaje: 0,
          ultimoMensaje: null,
        });

      grupo.compras.push({ compra, ultimoMensaje, mensajesNoLeidos, actividad, cerrada });
      grupo.mensajesNoLeidos += mensajesNoLeidos;
      grupo.ultimaActividad = Math.max(grupo.ultimaActividad, actividad);
      const actividadMensaje = Date.parse(ultimoMensaje?.enviado) || actividad;
      if (ultimoMensaje && actividadMensaje >= grupo.ultimaActividadMensaje) {
        grupo.ultimaActividadMensaje = actividadMensaje;
        grupo.ultimoMensaje = ultimoMensaje;
      }

      return grupos;
    }, {})
  )
    .map((grupo) => ({
      ...grupo,
      compras: grupo.compras.sort((a, b) => b.actividad - a.actividad),
    }))
    .sort((a, b) => b.ultimaActividad - a.ultimaActividad);

  const obtenerNombreContraparte = (compra) =>
    currentUser.rol === 'organizador'
      ? compra.compradorNombre ||
        (compra.comprador && typeof compra.comprador === 'object'
          ? `${compra.comprador.nombre || ''} ${compra.comprador.apellido || ''}`.trim()
          : compra.comprador) ||
        'Comprador'
      : compra.organizadorNombre ||
        (compra.evento?.organizador && typeof compra.evento.organizador === 'object'
          ? compra.evento.organizador.nombre
          : compra.evento?.organizador) ||
        'Organizador';

  const textoBusqueda = normalizarTexto(busqueda.trim());
  const cantidadNoLeidas = conversaciones.filter((compra) =>
    (compra.mensajes || []).some(
      (mensaje) =>
        mensaje.usuarioId !== currentUser.id &&
        !mensaje.leidoPor?.includes(currentUser.id)
    )
  ).length;
  const cantidadCerradas = conversaciones.filter((compra) =>
    isConversationClosed(compra, ahora)
  ).length;
  const conversacionesVisibles = conversacionesAgrupadas
    .map((grupo) => {
      let comprasVisibles = grupo.compras;
      if (filtro === 'noLeidos') {
        comprasVisibles = comprasVisibles.filter(({ mensajesNoLeidos }) => mensajesNoLeidos > 0);
      } else if (filtro === 'cerrados') {
        comprasVisibles = comprasVisibles.filter(({ cerrada }) => cerrada);
      }

      if (textoBusqueda) {
        const compraReferencia = comprasVisibles[0]?.compra || grupo.compras[0].compra;
        const contactoYEvento = normalizarTexto(
          `${obtenerNombreContraparte(compraReferencia)} ${
            compraReferencia.eventoNombre || compraReferencia.evento?.nombre || ''
          }`
        );

        if (!contactoYEvento.includes(textoBusqueda)) {
          comprasVisibles = comprasVisibles.filter(({ compra, ultimoMensaje }) =>
            normalizarTexto(
              `${compra.ordenCodigo || ''} ${compra.tipoEntradaNombre || compra.tipoEntrada?.nombre || ''} ${ultimoMensaje?.texto || ''}`
            ).includes(textoBusqueda)
          );
        }
      }

      if (comprasVisibles.length === 0) return null;

      const ultimaCompraConMensaje = [...comprasVisibles]
        .filter(({ ultimoMensaje }) => ultimoMensaje)
        .sort(
          (a, b) =>
            (Date.parse(b.ultimoMensaje.enviado) || b.actividad) -
            (Date.parse(a.ultimoMensaje.enviado) || a.actividad)
        )[0];

      return {
        ...grupo,
        compras: comprasVisibles,
        mensajesNoLeidos: comprasVisibles.reduce(
          (total, { mensajesNoLeidos }) => total + mensajesNoLeidos,
          0
        ),
        ultimoMensaje: ultimaCompraConMensaje?.ultimoMensaje || null,
      };
    })
    .filter(Boolean);

  const noHayConversaciones = conversaciones.length === 0;
  const noHayResultados = !noHayConversaciones && conversacionesVisibles.length === 0;

  return (
    <View style={styles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Bandeja de Mensajes" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerInfo}>
          <Text style={styles.pageTitle}>Tus Conversaciones</Text>
          {/*<Text style={styles.pageSubtitle}>
            {currentUser.rol === 'organizador'
              ? 'Responde directamente a las consultas de tus clientes'
              : 'Consulta directamente con los organizadores de tus eventos'}
          </Text>*/}
        </View>

        {!isLoading && !noHayConversaciones ? (
          <View style={styles.filters}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar contacto o evento..."
                placeholderTextColor={COLORS.textMuted}
                value={busqueda}
                onChangeText={setBusqueda}
                returnKeyType="search"
              />
              {busqueda.length > 0 ? (
                <TouchableOpacity
                  accessibilityLabel="Limpiar búsqueda"
                  onPress={() => setBusqueda('')}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>
            <View style={styles.filterTabs}>
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'noLeidos', label: 'No leídos', count: cantidadNoLeidas },
                { id: 'cerrados', label: 'Cerrados', count: cantidadCerradas },
              ].map((opcion) => {
                const activo = filtro === opcion.id;
                return (
                  <TouchableOpacity
                    key={opcion.id}
                    style={[styles.filterTab, activo && styles.filterTabActive]}
                    onPress={() => setFiltro(opcion.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activo }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterTabText, activo && styles.filterTabTextActive]}>
                      {opcion.label}
                    </Text>
                    {opcion.count !== undefined ? (
                      opcion.id === 'noLeidos' && opcion.count > 0 ? (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadCount}>{opcion.count}</Text>
                        </View>
                      ) : (
                        <Text style={[styles.filterCount, activo && styles.filterCountActive]}>
                          {opcion.count}
                        </Text>
                      )
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.inboxList}>
          {isLoading ? <ConversationListSkeleton /> : noHayConversaciones ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={34} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Todavía no hay conversaciones</Text>
              <Text style={styles.emptySubtitle}>
                Las conversaciones aparecerán acá cuando compres una entrada o alguien consulte por uno de tus eventos.
              </Text>
            </View>
          ) : noHayResultados ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={34} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No encontramos conversaciones</Text>
              <Text style={styles.emptySubtitle}>
                Probá con otro nombre o elegí otro filtro.
              </Text>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={() => {
                  setBusqueda('');
                  setFiltro('todos');
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
              </TouchableOpacity>
            </View>
          ) : conversacionesVisibles.map((grupo) => {
            const compraReferencia = grupo.compras[0].compra;
            const variasCompras = grupo.compras.length > 1;
            const conversacionCerrada = grupo.compras[0].cerrada;
            const encabezado = (
              <>
                <View style={styles.avatarBox}>
                  <Ionicons
                    name={currentUser.rol === 'organizador' ? 'person' : 'business'}
                    size={20}
                    color={COLORS.badgeCyanGlow}
                  />
                </View>

                <View style={styles.chatCardContent}>
                  <Text style={styles.chatTitle} numberOfLines={1}>
                    {obtenerNombreContraparte(compraReferencia)}
                  </Text>

                  <Text style={styles.eventRef}>
                    {compraReferencia.eventoNombre || compraReferencia.evento?.nombre}
                  </Text>

                  <Text style={styles.lastMessageText} numberOfLines={1}>
                    {variasCompras
                      ? `${grupo.compras.length} compras`
                      : grupo.compras[0].ultimoMensaje?.texto ||
                        'Toca para iniciar una consulta en esta compra...'}
                  </Text>
                </View>

                <View style={styles.chatCardAside}>
                  <Text style={styles.chatTime}>{grupo.ultimoMensaje?.fechaHora || 'Hoy'}</Text>
                  {!variasCompras && conversacionCerrada ? (
                    <View style={styles.closedBadge}>
                      <Text style={styles.closedBadgeText}>CERRADO</Text>
                    </View>
                  ) : null}
                  {grupo.mensajesNoLeidos > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>{grupo.mensajesNoLeidos}</Text>
                    </View>
                  ) : null}
                </View>
              </>
            );

            if (!variasCompras) {
              return (
                <TouchableOpacity
                  key={grupo.id}
                  style={[styles.chatCard, conversacionCerrada && styles.closedCard]}
                  onPress={() => navigation.navigate('Chat', { compraId: compraReferencia.id })}
                  activeOpacity={0.8}
                >
                  {encabezado}
                </TouchableOpacity>
              );
            }

            return (
              <View key={grupo.id} style={[styles.chatCard, styles.groupCard]}>
                <View style={styles.groupHeader}>{encabezado}</View>
                <View style={styles.orderList}>
                  {grupo.compras.map(({ compra, ultimoMensaje, mensajesNoLeidos, cerrada }) => {
                    const fechaUltimoMensaje = formatearFechaUltimoMensaje(ultimoMensaje);

                    return (
                      <TouchableOpacity
                        key={compra.id}
                        style={[styles.orderRow, cerrada && styles.closedOrderRow]}
                        onPress={() => navigation.navigate('Chat', { compraId: compra.id })}
                        activeOpacity={0.75}
                      >
                        <View style={styles.orderRowContent}>
                          <Text style={styles.orderTitle}>
                            {compra.ordenCodigo} · {compra.tipoEntradaNombre || compra.tipoEntrada?.nombre || 'Entrada'}
                          </Text>
                          <Text style={styles.orderPreview} numberOfLines={1}>
                            {ultimoMensaje
                              ? `${fechaUltimoMensaje ? `${fechaUltimoMensaje} · ` : ''}${ultimoMensaje.texto}`
                              : 'Sin mensajes todavía'}
                          </Text>
                        </View>
                        {cerrada ? (
                          <View style={styles.closedOrderBadge}>
                            <Text style={styles.closedBadgeText}>CERRADO</Text>
                          </View>
                        ) : null}
                        {mensajesNoLeidos > 0 ? (
                          <View style={styles.orderUnreadBadge}>
                            <Text style={styles.orderUnreadCount}>{mensajesNoLeidos}</Text>
                          </View>
                        ) : null}
                        <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
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
    paddingBottom: 30,
    gap: 16,
  },
  headerInfo: {
    marginBottom: 4,
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
  filters: {
    gap: 10,
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
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 8,
    borderRadius: 19,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterTabActive: {
    backgroundColor: COLORS.accentElectric,
    borderColor: COLORS.accentElectric,
  },
  filterTabText: {
    color: COLORS.badgeCyanGlow,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: COLORS.textPrimary,
  },
  filterCount: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 14,
    minWidth: 12,
    textAlign: 'center',
  },
  filterCountActive: {
    color: COLORS.textPrimary,
  },
  inboxList: {
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 44,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: COLORS.textMuted,
  },
  clearFiltersButton: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceCard,
  },
  clearFiltersText: {
    color: COLORS.badgeCyanGlow,
    fontSize: 12,
    fontWeight: '700',
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  closedCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  groupCard: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderList: {
    width: '100%',
    gap: 8,
    marginTop: 4,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 10,
  },
  closedOrderRow: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  orderRowContent: {
    flex: 1,
    minWidth: 0,
  },
  orderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  orderPreview: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  orderUnreadBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.accentElectric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderUnreadCount: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closedBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  closedOrderBadge: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  closedBadgeText: {
    color: COLORS.textMuted,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceCardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatCardContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  chatCardAside: {
    width: 56,
    alignSelf: 'stretch',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 10,
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  chatTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  eventRef: {
    fontSize: 11,
    color: COLORS.tertiary,
    marginTop: 1,
  },
  lastMessageText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accentElectric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
