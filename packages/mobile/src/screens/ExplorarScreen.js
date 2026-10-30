import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { CATEGORIAS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import useMockLoading from '../hooks/useMockLoading';
import { EventListSkeleton } from '../components/loading/Skeletons';

export default function ExplorarScreen({ navigation }) {
  const { eventos, favoritos, toggleFavorito } = useApp();
  const isLoading = useMockLoading();

  const [searchText, setSearchText] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todos');
  const [selectedSort, setSelectedSort] = useState('fecha'); // 'fecha' | 'precio' | 'rating'

  // Filter and sort events based on text, category and sort option
  const filteredEventos = useMemo(() => {
    let result = [...eventos];

    // Filter by category
    if (selectedCategoria !== 'Todos') {
      result = result.filter(
        (e) => e.categoria.toLowerCase() === selectedCategoria.toLowerCase()
      );
    }

    // Filter by text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      result = result.filter(
        (e) =>
          e.nombre.toLowerCase().includes(q) ||
          e.ubicacion.toLowerCase().includes(q) ||
          e.organizador.toLowerCase().includes(q) ||
          e.categoria.toLowerCase().includes(q)
      );
    }

    // Sort by Fecha, Precio or Ranking (TP explicit requirement)
    if (selectedSort === 'fecha') {
      result.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
    } else if (selectedSort === 'precio') {
      const getMinPrice = (e) =>
        e.tiposEntrada && e.tiposEntrada.length > 0
          ? Math.min(...e.tiposEntrada.map((t) => t.precio))
          : 0;
      result.sort((a, b) => getMinPrice(a) - getMinPrice(b));
    } else if (selectedSort === 'rating') {
      result.sort((a, b) => (b.organizadorRating || 0) - (a.organizadorRating || 0));
    }

    return result;
  }, [eventos, selectedCategoria, searchText, selectedSort]);

  // Find the featured event (or the first one)
  const eventoDestacado = useMemo(() => {
    return eventos.find((e) => e.destacado) || eventos[0];
  }, [eventos]);

  return (
    <View style={styles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Explorar" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search & Filter Bar */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar recitales, festivales, teatro..."
              placeholderTextColor={COLORS.textMuted}
              value={searchText}
              onChangeText={setSearchText}
            />
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        >
          {CATEGORIAS.map((cat) => {
            const isSelected = selectedCategoria === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
                onPress={() => setSelectedCategoria(cat)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextSelected,
                  ]}
                >
                  {cat === 'Todos' ? '🔥 Todos' : cat === 'Recitales' ? '🎵 Recitales' : cat === 'Festivales' ? '🎪 Festivales' : cat === 'Teatro' ? '🎭 Teatro' : cat === 'Conferencias' ? '🎤 Conferencias' : '⚽ Deportes'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Sorting Pills */}
        <View style={styles.sortSection}>
          <View style={styles.sortLabelRow}>
            <MaterialIcons name="sort" size={16} color={COLORS.tertiary} />
            <Text style={styles.sortLabel}>ORDENAR POR:</Text>
          </View>
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
                  onPress={() => setSelectedSort(sort.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>
                    {sort.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {isLoading ? (
          <EventListSkeleton count={3} />
        ) : (
          <>
        {/* Featured Event Card (Hero) */}
        {eventoDestacado && (
          <View style={styles.featuredSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={styles.pulseDot} />
                <Text style={styles.sectionTitle}>Evento Destacado</Text>
              </View>
              <Text style={styles.sectionBadge}>IMPERDIBLE</Text>
            </View>

            <TouchableOpacity
              style={styles.featuredCard}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('DetalleEvento', { eventoId: eventoDestacado.id })}
            >
              {/* Media image container */}
              <View style={styles.featuredImageContainer}>
                <Image source={{ uri: eventoDestacado.imagen }} style={styles.featuredImage} />
                <View style={styles.imageOverlay} />

                {/* Top Badges */}
                <View style={styles.imageTopBadges}>
                  <View style={styles.badgeAvailable}>
                    <View style={styles.badgeGreenDot} />
                    <Text style={styles.badgeAvailableText}>DISPONIBLE</Text>
                  </View>
                  <View style={styles.badgeCategory}>
                    <Text style={styles.badgeCategoryText}>🔥 FESTIVAL TOP</Text>
                  </View>
                </View>

                {/* Favorite Heart Button */}
                <TouchableOpacity
                  style={styles.heartButton}
                  onPress={() => toggleFavorito(eventoDestacado.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={favoritos.includes(eventoDestacado.id) ? 'heart' : 'heart-outline'}
                    size={20}
                    color={favoritos.includes(eventoDestacado.id) ? COLORS.accentElectric : COLORS.textPrimary}
                  />
                </TouchableOpacity>

                {/* Rating on image corner */}
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={13} color={COLORS.statusWarning} />
                  <Text style={styles.ratingText}>{eventoDestacado.organizadorRating}</Text>
                  <Text style={styles.ratingCount}>({eventoDestacado.totalResenias})</Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.featuredBody}>
                <Text style={styles.featuredTitle}>{eventoDestacado.nombre}</Text>

                <View style={styles.featuredInfoRow}>
                  <Ionicons name="calendar-outline" size={14} color={COLORS.tertiary} />
                  <Text style={styles.featuredInfoText}>{eventoDestacado.fechaTexto}</Text>
                </View>

                <View style={styles.featuredInfoRow}>
                  <Ionicons name="location-outline" size={14} color={COLORS.accentElectric} />
                  <Text style={styles.featuredInfoText} numberOfLines={1}>
                    {eventoDestacado.ubicacion}
                  </Text>
                </View>

                {/* Price and Stock row */}
                <View style={styles.priceRow}>
                  <View>
                    <Text style={styles.pricePrefix}>DESDE</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceAmount}>
                        ${eventoDestacado.tiposEntrada[0]?.precio?.toLocaleString('es-AR')}
                      </Text>
                      <Text style={styles.priceSuffix}> / {eventoDestacado.tiposEntrada[0]?.nombre}</Text>
                    </View>
                  </View>

                  <View style={styles.stockBadge}>
                    <Ionicons name="checkmark-circle" size={13} color={COLORS.statusSuccess} />
                    <Text style={styles.stockText}>Cupos Activos</Text>
                  </View>
                </View>

                {/* Big Neon CTA Button */}
                <TouchableOpacity
                  style={styles.buyButton}
                  onPress={() => navigation.navigate('DetalleEvento', { eventoId: eventoDestacado.id })}
                  activeOpacity={0.85}
                >
                  <Text style={styles.buyButtonText}>COMPRAR ENTRADAS</Text>
                  <Feather name="arrow-right" size={18} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Upcoming Events (Próximos en Cartelera) */}
        <View style={styles.upcomingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximos en Cartelera</Text>
            <Text style={styles.sectionLink}>VER TODOS ({filteredEventos.length})</Text>
          </View>

          {filteredEventos.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.upcomingCard}
              onPress={() => navigation.navigate('DetalleEvento', { eventoId: item.id })}
              activeOpacity={0.8}
            >
              <Image source={{ uri: item.imagen }} style={styles.upcomingImage} />
              <View style={styles.upcomingDetails}>
                <View style={styles.upcomingHeaderRow}>
                  <View style={styles.upcomingCategoryTag}>
                    <Text style={styles.upcomingCategoryText}>{item.categoria.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity onPress={() => toggleFavorito(item.id)}>
                    <Ionicons
                      name={favoritos.includes(item.id) ? 'heart' : 'heart-outline'}
                      size={18}
                      color={favoritos.includes(item.id) ? COLORS.accentElectric : COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={styles.upcomingTitle} numberOfLines={1}>
                  {item.nombre}
                </Text>
                <Text style={styles.upcomingDate} numberOfLines={1}>
                  {item.fechaTexto}
                </Text>

                <View style={styles.upcomingFooterRow}>
                  <Text style={styles.upcomingPrice}>
                    ${item.tiposEntrada[0]?.precio?.toLocaleString('es-AR')}
                  </Text>
                  <View style={styles.upcomingRating}>
                    <Ionicons name="star" size={12} color={COLORS.statusWarning} />
                    <Text style={styles.upcomingRatingText}>{item.organizadorRating}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
          </>
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
  sortLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  sortPillsGroup: {
    flexDirection: 'row',
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
  sortPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  sortPillTextActive: {
    color: COLORS.textPrimary,
    fontWeight: '700',
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
