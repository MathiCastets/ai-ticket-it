import React, { useState, useMemo } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import useMockLoading from '../hooks/useMockLoading';
import { EventListSkeleton } from '../components/loading/Skeletons';
import AccessDeniedView from '../components/AccessDeniedView';
import { useNotification } from '../components/NotificationProvider';

export default function ExplorarScreen({ navigation }) {
  const { eventos, categorias, favoritos, favoritosError, toggleFavorito, currentUser } = useApp();
  const { notify } = useNotification();
  const isLoading = useMockLoading();

  const [searchText, setSearchText] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todos');
  const [selectedSort, setSelectedSort] = useState('fecha'); // 'fecha' | 'precio' | 'rating'
  const [sortDirection, setSortDirection] = useState('asc');
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const getCat = (c) => (typeof c === 'object' && c !== null ? c.nombre || '' : c || '');
  const getOrg = (o) => (typeof o === 'object' && o !== null ? o.nombre || '' : o || '');
  const categoriasDisponibles = useMemo(
    () =>
      [
        'Todos',
        ...new Set(
          [...(categorias || []).map(getCat), ...eventos.map((evento) => getCat(evento.categoria))]
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'es'))
        ),
      ],
    [categorias, eventos]
  );
  const resumenesPorOrganizador = useMemo(() => {
    const acumulados = new Map();

    eventos.forEach((evento) => {
      const organizadorId = evento.organizadorId || evento.organizadorObj?.id;
      const totalResenias = Number(evento.totalResenias);
      const rating = Number(evento.organizadorRating);
      if (
        !organizadorId ||
        !Number.isFinite(totalResenias) ||
        totalResenias <= 0 ||
        !Number.isFinite(rating)
      ) {
        return;
      }

      const resumen = acumulados.get(organizadorId) || { sumaPonderada: 0, totalResenias: 0 };
      resumen.sumaPonderada += rating * totalResenias;
      resumen.totalResenias += totalResenias;
      acumulados.set(organizadorId, resumen);
    });

    return new Map(
      [...acumulados].map(([organizadorId, resumen]) => [
        organizadorId,
        {
          rating: resumen.sumaPonderada / resumen.totalResenias,
          totalResenias: resumen.totalResenias,
        },
      ])
    );
  }, [eventos]);
  const obtenerResumenOrganizador = (evento) =>
    resumenesPorOrganizador.get(evento.organizadorId || evento.organizadorObj?.id);

  const filteredEventos = useMemo(() => {
    const ahora = Date.now();
    let result = eventos.filter((evento) => {
      const fechaEvento = Date.parse(evento.fecha);
      return Number.isFinite(fechaEvento) && fechaEvento >= ahora;
    });

    if (soloFavoritos) {
      result = result.filter((evento) => favoritos.includes(evento.id));
    }

    if (selectedCategoria !== 'Todos') {
      result = result.filter((e) => getCat(e.categoria).toLowerCase() === selectedCategoria.toLowerCase());
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (e) =>
          (e.nombre || '').toLowerCase().includes(q) ||
          (e.ubicacion || '').toLowerCase().includes(q) ||
          getOrg(e.organizador).toLowerCase().includes(q) ||
          getCat(e.categoria).toLowerCase().includes(q)
      );
    }

    const direction = sortDirection === 'asc' ? 1 : -1;

    if (selectedSort === 'fecha') {
      result.sort((a, b) => direction * (new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
    } else if (selectedSort === 'precio') {
      const getMinPrice = (e) => (e.tiposEntrada && e.tiposEntrada.length > 0 ? Math.min(...e.tiposEntrada.map((t) => t.precio)) : 0);
      result.sort((a, b) => direction * (getMinPrice(a) - getMinPrice(b)));
    } else if (selectedSort === 'rating') {
      result.sort(
        (a, b) =>
          direction *
          ((obtenerResumenOrganizador(a)?.rating || 0) -
            (obtenerResumenOrganizador(b)?.rating || 0))
      );
    }

    return result;
  }, [
    eventos,
    favoritos,
    soloFavoritos,
    selectedCategoria,
    searchText,
    selectedSort,
    sortDirection,
    resumenesPorOrganizador,
  ]);

  if (currentUser?.rol === 'organizador') {
    return (
      <AccessDeniedView
        headerTitle="Explorar Eventos"
        headerSubtitle="Acceso Restringido"
        actionText="Ir a Mis Eventos"
        onBack={() => navigation.navigate('MainTabs')}
        navigation={navigation}
      />
    );
  }

  const handleToggleFavorito = async (eventoId) => {
    try {
      await toggleFavorito(eventoId);
    } catch (error) {
      notify({
        title: 'No se pudo actualizar el favorito',
        message: error.message,
        type: 'error',
      });
    }
  };

  const opcionesOrden = [
    { id: 'fecha', label: 'Fecha' },
    { id: 'precio', label: 'Precio' },
    { id: 'rating', label: 'Ranking' },
  ];
  const ordenSeleccionado = opcionesOrden.find((opcion) => opcion.id === selectedSort);
  const seleccionarOrden = (sortId) => {
    if (sortId !== selectedSort) {
      setSelectedSort(sortId);
      setSortDirection(sortId === 'rating' ? 'desc' : 'asc');
    }
    setSortMenuVisible(false);
  };

  return (
    <View style={styles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Explorar" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {favoritosError ? (
          <Text style={{ color: COLORS.textMuted, marginBottom: 12 }}>
            No se pudieron sincronizar los favoritos: {favoritosError}
          </Text>
        ) : null}
        {/* Search & Filter Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput style={styles.searchInput} placeholder="Buscar recitales, festivales, teatro..." placeholderTextColor={COLORS.textMuted} value={searchText} onChangeText={setSearchText} />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.eventCountSection}>
          <Text style={styles.eventCount}>
            {filteredEventos.length} {filteredEventos.length === 1 ? 'evento' : 'eventos'}
          </Text>
          <View style={styles.sortMenuControls}>
            <TouchableOpacity
              style={styles.sortMenuButton}
              onPress={() => setSortMenuVisible(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Ordenar por: ${ordenSeleccionado?.label || 'Fecha'}`}
              accessibilityHint="Abre las opciones de ordenamiento"
            >
              <Text style={styles.sortMenuLabel}>Ordenar por:</Text>
              <Text style={styles.sortMenuValue}>{ordenSeleccionado?.label || 'Fecha'}</Text>
              <Ionicons name="chevron-down" size={14} color={COLORS.badgeCyanGlow} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sortDirectionButton}
              onPress={() =>
                setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'))
              }
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Cambiar a orden ${sortDirection === 'asc' ? 'descendente' : 'ascendente'}`}
            >
              <MaterialIcons
                name={sortDirection === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                size={16}
                color={COLORS.badgeCyanGlow}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          <TouchableOpacity
            style={[styles.categoryChip, soloFavoritos && styles.categoryChipSelected]}
            onPress={() => setSoloFavoritos((active) => !active)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={soloFavoritos ? 'Mostrar todos los eventos' : 'Mostrar solo favoritos'}
            accessibilityState={{ selected: soloFavoritos }}
          >
            <Ionicons
              name={soloFavoritos ? 'heart' : 'heart-outline'}
              size={13}
              color={soloFavoritos ? COLORS.textPrimary : COLORS.textSecondary}
            />
            <Text style={[styles.categoryText, soloFavoritos && styles.categoryTextSelected]}>
              Favoritos
            </Text>
          </TouchableOpacity>
          {categoriasDisponibles.map((cat) => {
            const isSelected = selectedCategoria === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategoria(cat)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <EventListSkeleton count={3} />
        ) : (
          <View style={styles.eventList}>
            {filteredEventos.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={34} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No encontramos eventos</Text>
                <Text style={styles.emptySubtitle}>
                  Probá con otra búsqueda o modificá los filtros.
                </Text>
              </View>
            ) : filteredEventos.map((item) => {
              const resumenOrganizador = obtenerResumenOrganizador(item);
              return (
              <TouchableOpacity key={item.id} style={styles.eventCard} onPress={() => navigation.navigate('DetalleEvento', { eventoId: item.id })} activeOpacity={0.8}>
                <View style={styles.eventImageContainer}>
                  <Image source={item.imagen ? { uri: item.imagen } : null} style={styles.eventImage} />
                  <LinearGradient
                    colors={['rgba(15, 8, 29, 0.62)', 'rgba(15, 8, 29, 0)']}
                    style={styles.imageTopScrim}
                    pointerEvents="none"
                  />
                  <View style={styles.eventCategoryTag}>
                    <Text style={styles.eventCategoryText}>{getCat(item.categoria)}</Text>
                  </View>
                  <TouchableOpacity style={styles.eventFavoriteButton} onPress={() => handleToggleFavorito(item.id)} activeOpacity={0.8}>
                    <Ionicons name={favoritos.includes(item.id) ? 'heart' : 'heart-outline'} size={18} color={favoritos.includes(item.id) ? COLORS.accentElectric : COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle} numberOfLines={1}>
                    {item.nombre}
                  </Text>
                  <View style={styles.eventInfoRow}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.eventInfoText} numberOfLines={1}>
                      {item.fechaTexto}
                    </Text>
                  </View>
                  <View style={styles.eventInfoRow}>
                    <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                    <Text style={styles.eventInfoText} numberOfLines={1}>
                      {item.ubicacion}
                    </Text>
                  </View>
                  <View style={styles.eventFooter}>
                    <View style={styles.eventOrganizer}>
                      <Ionicons name="business-outline" size={13} color={COLORS.tertiary} />
                      <Text style={styles.eventOrganizerName} numberOfLines={1}>
                        {getOrg(item.organizador)}
                      </Text>
                      <Text style={styles.eventOrganizerSeparator}>•</Text>
                      {resumenOrganizador?.totalResenias > 0 &&
                      Number.isFinite(resumenOrganizador.rating) ? (
                        <>
                          <Ionicons name="star" size={12} color={COLORS.statusWarning} />
                          <Text style={styles.eventRating}>
                            {resumenOrganizador.rating.toFixed(1)}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.eventNewLabel}>Nuevo</Text>
                      )}
                    </View>
                    <View style={styles.eventPriceBadge}>
                      <Text style={styles.eventPrice}>
                        Desde{' '}
                        <Text style={styles.eventPriceAmount}>
                          ${item.tiposEntrada[0]?.precio?.toLocaleString('es-AR')}
                        </Text>
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
      <Modal
        transparent
        visible={sortMenuVisible}
        animationType="fade"
        onRequestClose={() => setSortMenuVisible(false)}
      >
        <View style={styles.sortModalBackdrop}>
          <TouchableOpacity
            style={styles.sortModalDismiss}
            activeOpacity={1}
            onPress={() => setSortMenuVisible(false)}
            accessibilityLabel="Cerrar opciones de ordenamiento"
          />
          <View style={styles.sortModalCard}>
            <Text style={styles.sortModalTitle}>Ordenar por</Text>
            {opcionesOrden.map((opcion) => {
              const activa = selectedSort === opcion.id;
              return (
                <TouchableOpacity
                  key={opcion.id}
                  style={[styles.sortOption, activa && styles.sortOptionActive]}
                  onPress={() => seleccionarOrden(opcion.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activa }}
                >
                  <Text style={[styles.sortOptionText, activa && styles.sortOptionTextActive]}>
                    {opcion.label}
                  </Text>
                  {activa ? (
                    <Ionicons name="checkmark" size={18} color={COLORS.badgeCyanGlow} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
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
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 22,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  eventCountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    gap: 8,
  },
  sortMenuControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  sortMenuLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
  sortMenuValue: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },
  sortDirectionButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  categoryChipSelected: {
    backgroundColor: COLORS.secondaryContainer,
    borderColor: COLORS.primaryContainer,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryTextSelected: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  eventCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sortModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 8, 29, 0.75)',
  },
  sortModalDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  sortModalCard: {
    width: '100%',
    maxWidth: 320,
    padding: 16,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sortModalTitle: {
    marginBottom: 8,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  sortOption: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  sortOptionActive: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  sortOptionText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  sortOptionTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  eventList: {
    paddingHorizontal: 16,
    gap: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
  },
  eventCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  eventImageContainer: {
    position: 'relative',
    height: 190,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  imageTopScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 78,
  },
  eventCategoryTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 8, 29, 0.8)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  eventCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventFavoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 8, 29, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    padding: 14,
    gap: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventInfoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  eventOrganizer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  eventRating: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 0,
  },
  eventOrganizerName: {
    minWidth: 0,
    flexShrink: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  eventOrganizerSeparator: {
    color: COLORS.textMuted,
    fontSize: 11,
    flexShrink: 0,
  },
  eventNewLabel: {
    color: COLORS.badgeCyanGlow,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
  },
  eventPrice: {
    fontSize: 10,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  eventPriceAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.badgeCyanGlow,
  },
  eventPriceBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 210, 242, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 242, 0.2)',
  },
  featuredSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accentElectric,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tertiary,
    letterSpacing: 0.8,
  },
  sectionLink: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
  },
  featuredCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  featuredImageContainer: {
    position: 'relative',
    width: '100%',
    height: 190,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 8, 29, 0.35)',
  },
  imageTopBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  badgeAvailable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(15, 8, 29, 0.8)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.badgeCyanGlow,
  },
  badgeAvailableText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
    letterSpacing: 0.5,
  },
  badgeCategory: {
    backgroundColor: 'rgba(255, 0, 127, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 8, 29, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 8, 29, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ratingCount: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  featuredBody: {
    padding: 16,
  },
  featuredTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  featuredInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  featuredInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  pricePrefix: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  priceSuffix: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 245, 160, 0.12)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.statusSuccess,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accentElectric,
    height: 48,
    borderRadius: 24,
    shadowColor: COLORS.accentElectric,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  buyButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  upcomingSection: {
    paddingHorizontal: 16,
    gap: 12,
  },
  upcomingCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 10,
    gap: 12,
  },
  upcomingImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },
  upcomingDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  upcomingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upcomingCategoryTag: {
    backgroundColor: COLORS.surfaceCardSubtle,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  upcomingCategoryText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  upcomingDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  upcomingFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upcomingPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.badgeCyanGlow,
  },
  upcomingRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  upcomingRatingText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
