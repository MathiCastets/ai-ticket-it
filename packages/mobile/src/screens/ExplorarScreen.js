import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { CATEGORIAS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import useMockLoading from '../hooks/useMockLoading';
import { EventListSkeleton } from '../components/loading/Skeletons';

export default function ExplorarScreen({ navigation }) {
  const { eventos, favoritos, favoritosError, toggleFavorito } = useApp();
  const isLoading = useMockLoading();

  const [searchText, setSearchText] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todos');
  const [selectedSort, setSelectedSort] = useState('fecha'); // 'fecha' | 'precio' | 'rating'
  const [sortDirection, setSortDirection] = useState('asc');
  const handleToggleFavorito = (eventoId) => toggleFavorito(eventoId).catch(() => {});

  const getCat = (c) => (typeof c === 'object' && c !== null ? c.nombre || '' : c || '');
  const getOrg = (o) => (typeof o === 'object' && o !== null ? o.nombre || '' : o || '');

  // Filter and sort events based on text, category and sort option
  const filteredEventos = useMemo(() => {
    let result = [...eventos];

    // Filter by category
    if (selectedCategoria !== 'Todos') {
      result = result.filter((e) => getCat(e.categoria).toLowerCase() === selectedCategoria.toLowerCase());
    }

    // Filter by text search
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

    // Sort by Fecha, Precio or Ranking (TP explicit requirement)
    if (selectedSort === 'fecha') {
      result.sort((a, b) => direction * (new Date(a.fecha).getTime() - new Date(b.fecha).getTime()));
    } else if (selectedSort === 'precio') {
      const getMinPrice = (e) => (e.tiposEntrada && e.tiposEntrada.length > 0 ? Math.min(...e.tiposEntrada.map((t) => t.precio)) : 0);
      result.sort((a, b) => direction * (getMinPrice(a) - getMinPrice(b)));
    } else if (selectedSort === 'rating') {
      result.sort((a, b) => direction * ((a.organizadorRating || 0) - (b.organizadorRating || 0)));
    }

    return result;
  }, [eventos, selectedCategoria, searchText, selectedSort, sortDirection]);

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
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.8}>
            <Feather name="sliders" size={18} color={COLORS.badgeCyanGlow} />
          </TouchableOpacity>
        </View>

        {/* Categories Horizontal Scroll */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
          {CATEGORIAS.map((cat) => {
            const isSelected = selectedCategoria === cat;
            return (
              <TouchableOpacity key={cat} style={[styles.categoryChip, isSelected && styles.categoryChipSelected]} onPress={() => setSelectedCategoria(cat)} activeOpacity={0.75}>
                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                  {cat === 'Todos' ? '🔥 Todos' : cat === 'Recitales' ? '🎵 Recitales' : cat === 'Festivales' ? '🎪 Festivales' : cat === 'Teatro' ? '🎭 Teatro' : cat === 'Conferencias' ? '🎤 Conferencias' : '⚽ Deportes'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.sortSection}>
          <Text style={styles.eventCount}>
            {filteredEventos.length} {filteredEventos.length === 1 ? 'evento' : 'eventos'}
          </Text>
          <View style={styles.sortPillsGroup}>
            {[
              { id: 'fecha', label: 'Fecha' },
              { id: 'precio', label: 'Precio' },
              { id: 'rating', label: 'Ranking' },
            ].map((sort) => {
              const active = selectedSort === sort.id;
              return (
                <TouchableOpacity
                  key={sort.id}
                  style={[styles.sortPill, active && styles.sortPillActive]}
                  onPress={() => {
                    if (sort.id === selectedSort) {
                      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
                    } else {
                      setSelectedSort(sort.id);
                      setSortDirection(sort.id === 'rating' ? 'desc' : 'asc');
                    }
                  }}
                  hitSlop={4}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Ordenar por ${sort.label}${active ? `, ${sortDirection === 'asc' ? 'ascendente' : 'descendente'}` : ''}`}
                  accessibilityHint={active ? 'Toca nuevamente para invertir el orden' : undefined}
                >
                  <View style={styles.sortPillContent}>
                    <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>{sort.label}</Text>
                    {active && (
                      <MaterialIcons
                        name={sortDirection === 'asc' ? 'arrow-upward' : 'arrow-downward'}
                        size={14}
                        color={COLORS.textPrimary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {isLoading ? (
          <EventListSkeleton count={3} />
        ) : (
          <View style={styles.eventList}>
            {filteredEventos.map((item) => (
              <TouchableOpacity key={item.id} style={styles.eventCard} onPress={() => navigation.navigate('DetalleEvento', { eventoId: item.id })} activeOpacity={0.8}>
                <View style={styles.eventImageContainer}>
                  <Image source={{ uri: item.imagen }} style={styles.eventImage} />
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
                      <Ionicons name="star" size={12} color={COLORS.statusWarning} />
                      <Text style={styles.eventRating}>{item.organizadorRating}</Text>
                      <Text style={styles.eventOrganizerName} numberOfLines={1}>
                        {getOrg(item.organizador)}
                      </Text>
                    </View>
                    <Text style={styles.eventPrice}>
                      Desde <Text style={styles.eventPriceAmount}>${item.tiposEntrada[0]?.precio?.toLocaleString('es-AR')}</Text>
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
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
  sortSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  eventCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sortPillsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 16,
    padding: 3,
    gap: 4,
  },
  sortPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  sortPillActive: {
    backgroundColor: COLORS.accentVioletDeep,
  },
  sortPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sortPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  sortPillTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  eventList: {
    paddingHorizontal: 16,
    gap: 14,
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
  },
  eventRating: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventOrganizerName: {
    flexShrink: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  eventPrice: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  eventPriceAmount: {
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
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
