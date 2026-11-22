import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { commonStyles } from '../theme/commonStyles';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import AccessDeniedView from '../components/AccessDeniedView';
import { useNotification } from '../components/NotificationProvider';
import EventCard from '../components/eventos/EventCard';
import SortOptionsModal from '../components/eventos/SortOptionsModal';

export default function ExplorarScreen({ navigation }) {
  const { eventos, categorias, favoritos, favoritosError, toggleFavorito, currentUser } = useApp();
  const { notify } = useNotification();

  const [searchText, setSearchText] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('Todos');
  const [selectedSort, setSelectedSort] = useState('fecha'); // 'fecha' | 'precio' | 'rating'
  const [sortDirection, setSortDirection] = useState('asc');
  const [soloFavoritos, setSoloFavoritos] = useState(false);
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  const getCat = (c) => (typeof c === 'object' && c !== null ? c.nombre || '' : c || '');
  const getOrg = (o) => (typeof o === 'object' && o !== null ? o.nombre || '' : o || '');
  const getMinPrice = (evento) =>
    evento.tiposEntrada?.length
      ? Math.min(...evento.tiposEntrada.map((t) => t.precio))
      : 0;
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
      const rating =
        evento.organizadorRating !== null && evento.organizadorRating !== undefined
          ? Number(evento.organizadorRating)
          : NaN;
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
    <View style={commonStyles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Explorar" />

      <ScrollView style={commonStyles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {favoritosError ? (
          <Text style={{ color: COLORS.textMuted, marginBottom: 12 }}>
            No se pudieron sincronizar los favoritos: {favoritosError}
          </Text>
        ) : null}
        {/* Search & Filter Bar */}
        <View style={styles.searchSection}>
          <SearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Buscar recitales, festivales, teatro..."
            accessibilityLabel="Buscar eventos por nombre, lugar, organizador o categoría"
            style={styles.searchBar}
            inputStyle={styles.searchInput}
          />
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

        <View style={styles.eventList}>
          {filteredEventos.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={34} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No encontramos eventos</Text>
              <Text style={styles.emptySubtitle}>
                Probá con otra búsqueda o modificá los filtros.
              </Text>
            </View>
          ) : filteredEventos.map((item) => (
            <EventCard
              key={item.id}
              item={item}
              isFavorito={favoritos.includes(item.id)}
              resumenOrganizador={obtenerResumenOrganizador(item)}
              minPrice={getMinPrice(item)}
              categoriaNombre={getCat(item.categoria)}
              organizadorNombre={getOrg(item.organizador)}
              onPress={() => navigation.navigate('DetalleEvento', { eventoId: item.id })}
              onToggleFavorito={() => handleToggleFavorito(item.id)}
            />
          ))}
        </View>
      </ScrollView>
      <SortOptionsModal
        visible={sortMenuVisible}
        opciones={opcionesOrden}
        selectedSort={selectedSort}
        onSelect={seleccionarOrden}
        onClose={() => setSortMenuVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
  searchBar: {
    flex: 1,
  },
  searchInput: {
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
});
