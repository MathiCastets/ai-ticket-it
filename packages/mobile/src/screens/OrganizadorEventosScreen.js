import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/loading/Spinners';
import useMockLoading from '../hooks/useMockLoading';
import DateTimeSelector, { formatearFechaEvento } from '../components/DateTimeSelector';

const crearFormulario = (evento) => ({
  nombre: evento.nombre || '',
  descripcion: evento.descripcion || '',
  ubicacion: evento.ubicacion || '',
  fecha: new Date(evento.fecha),
  fechaModificada: false,
  imagen: evento.imagen || '',
  imagenSeleccionada: null,
  quitarImagen: false,
});

const normalizarTexto = (texto) =>
  String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();

const obtenerEstadoEvento = (evento, ahora) => {
  const fecha = new Date(evento.fecha).getTime();
  if (!Number.isFinite(fecha)) return 'sinFecha';
  return fecha <= ahora ? 'terminados' : 'activos';
};

export default function OrganizadorEventosScreen({ navigation, route }) {
  const { eventos, categorias, currentUser, actualizarEvento } = useApp();
  const isLoading = useMockLoading();
  const eventosDelUsuario = eventos.filter((evento) => evento.organizadorId === currentUser.id);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const ahora = Date.now();
  const textoBusqueda = normalizarTexto(busqueda.trim());
  const errorRangoFechas =
    fechaDesde &&
    fechaHasta &&
    fechaDesde.getTime() > fechaHasta.getTime()
      ? 'La fecha Desde debe ser anterior o igual a Hasta.'
      : '';
  const categoriasDisponibles = [
    'Todas',
    ...new Set([
      ...(categorias || []),
      ...eventosDelUsuario.map((evento) => evento.categoria).filter(Boolean),
    ]),
  ];
  const cantidadActivos = eventosDelUsuario.filter(
    (evento) => obtenerEstadoEvento(evento, ahora) === 'activos'
  ).length;
  const cantidadTerminados = eventosDelUsuario.filter(
    (evento) => obtenerEstadoEvento(evento, ahora) === 'terminados'
  ).length;
  const eventosVisibles = eventosDelUsuario
    .filter((evento) => {
      const estado = obtenerEstadoEvento(evento, ahora);
      const coincideEstado = filtroEstado === 'todos' || estado === filtroEstado;
      const coincideCategoria =
        categoriaSeleccionada === 'Todas' || evento.categoria === categoriaSeleccionada;
      const coincideBusqueda =
        !textoBusqueda ||
        normalizarTexto(
          `${evento.nombre || ''} ${evento.categoria || ''} ${evento.descripcion || ''} ${evento.ubicacion || ''}`
        ).includes(textoBusqueda);
      const fechaEvento = new Date(evento.fecha).getTime();
      const coincideFecha =
        !errorRangoFechas &&
        ((!fechaDesde && !fechaHasta) ||
          (Number.isFinite(fechaEvento) &&
            (!fechaDesde || fechaEvento >= fechaDesde.getTime()) &&
            (!fechaHasta ||
              fechaEvento <=
                new Date(
                  fechaHasta.getFullYear(),
                  fechaHasta.getMonth(),
                  fechaHasta.getDate(),
                  23,
                  59,
                  59,
                  999
                ).getTime())));

      return coincideEstado && coincideCategoria && coincideBusqueda && coincideFecha;
    })
    .sort(
      (eventoA, eventoB) =>
        Number(obtenerEstadoEvento(eventoA, ahora) === 'terminados') -
        Number(obtenerEstadoEvento(eventoB, ahora) === 'terminados')
    );

  const abrirEdicion = (evento) => {
    setEventoEditando(evento);
    setFormulario(crearFormulario(evento));
  };

  useEffect(() => {
    const eventoId = route?.params?.editEventoId;
    if (!eventoId) return;

    const evento = eventosDelUsuario.find((item) => item.id === eventoId);
    if (evento) abrirEdicion(evento);
    navigation.setParams({ editEventoId: undefined });
  }, [route?.params?.editEventoId, eventos, navigation]);

  const cerrarEdicion = () => {
    if (isSaving || isPickingImage) return;
    setEventoEditando(null);
    setFormulario(null);
  };

  const seleccionarImagen = async () => {
    setIsPickingImage(true);
    try {
      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        selectionLimit: 1,
        quality: 0.85,
      });
      if (resultado.canceled || !resultado.assets?.length) return;

      const imagen = resultado.assets[0];
      const extension = imagen.fileName?.split('.').pop()?.toLowerCase();
      const mimeType =
        imagen.mimeType ||
        ({ jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[
          extension
        ] || '');
      const formatoValido =
        !mimeType || ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType);
      const tamanioValido = !imagen.fileSize || imagen.fileSize <= 5 * 1024 * 1024;
      if (!formatoValido || !tamanioValido) {
        Alert.alert(
          'La foto no se pudo agregar',
          'Se aceptan imágenes JPEG, PNG o WebP de hasta 5 MB.'
        );
        return;
      }

      setFormulario((prev) => ({
        ...prev,
        imagen: imagen.uri,
        imagenSeleccionada: imagen,
        quitarImagen: false,
      }));
    } catch (error) {
      Alert.alert('No se pudo seleccionar la foto', error.message);
    } finally {
      setIsPickingImage(false);
    }
  };

  const guardarCambios = async () => {
    if (!formulario.nombre.trim()) {
      Alert.alert('Falta el nombre', 'El evento debe tener un nombre.');
      return;
    }

    setIsSaving(true);
    try {
      const resultado = await actualizarEvento(eventoEditando.id, {
        nombre: formulario.nombre,
        descripcion: formulario.descripcion,
        ubicacion: formulario.ubicacion,
        ...(formulario.fechaModificada
          ? {
              fecha: formulario.fecha.toISOString(),
              fechaTexto: formatearFechaEvento(formulario.fecha),
            }
          : {}),
        ...(formulario.quitarImagen ? { imagen: '' } : {}),
        imagenes: formulario.imagenSeleccionada ? [formulario.imagenSeleccionada] : [],
      });
      if (!resultado.success) throw new Error(resultado.error || 'No se pudieron guardar los cambios.');
      setEventoEditando(null);
      setFormulario(null);
    } catch (error) {
      Alert.alert('No se pudieron guardar los cambios', error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Header title="AI Ticket It" subtitle="Mis Eventos" />
      {isLoading ? (
        <View style={styles.loading}>
          <LoadingSpinner variant="dual" label="Cargando tus eventos..." />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.pageHeading}>
            <Text style={styles.title}>Tus eventos</Text>
            {/*<Text style={styles.subtitle}>Administrá la información y revisá el rendimiento de cada uno.</Text>*/}
          </View>

          {eventosDelUsuario.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Todavía no publicaste eventos</Text>
              <Text style={styles.subtitle}>Usá Organizar para crear tu primer evento.</Text>
            </View>
          ) : (
            <>
              <View style={styles.filters}>
                <View style={styles.searchInputContainer}>
                  <Ionicons name="search" size={18} color={COLORS.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar por nombre o categoría..."
                    placeholderTextColor={COLORS.textMuted}
                    value={busqueda}
                    onChangeText={setBusqueda}
                    returnKeyType="search"
                    accessibilityLabel="Buscar eventos por nombre o categoría"
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
                <View style={styles.filterTabs}>
                  {[
                    { id: 'todos', label: 'Todos', count: eventosDelUsuario.length },
                    { id: 'activos', label: 'Activos', count: cantidadActivos },
                    { id: 'terminados', label: 'Terminados', count: cantidadTerminados },
                  ].map((opcion) => {
                    const activo = filtroEstado === opcion.id;
                    return (
                      <TouchableOpacity
                        key={opcion.id}
                        style={[styles.filterTab, activo && styles.filterTabActive]}
                        onPress={() => setFiltroEstado(opcion.id)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: activo }}
                      >
                        <Text style={[styles.filterTabText, activo && styles.filterTabTextActive]}>
                          {opcion.label}
                        </Text>
                        <View
                          style={[
                            styles.filterCountBadge,
                            activo && styles.filterCountBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.filterCount,
                              activo && styles.filterCountActive,
                            ]}
                          >
                            {opcion.count}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <View style={styles.dateRange}>
                  <View style={styles.dateRangeLabels}>
                    <Text style={[styles.dateFieldLabel, styles.dateField]}>Desde</Text>
                    <View style={styles.dateRangeArrowSpacer} />
                    <Text style={[styles.dateFieldLabel, styles.dateField]}>Hasta</Text>
                  </View>
                  <View style={styles.dateRangeFields}>
                    <View style={styles.dateField}>
                      <View style={styles.datePickerRow}>
                        <View style={styles.datePicker}>
                          <DateTimeSelector
                            value={fechaDesde}
                            onChange={setFechaDesde}
                            dateOnly
                            allowPastDates
                            placeholder="Elegir fecha"
                            accessibilityLabel="Filtrar desde la fecha"
                          />
                        </View>
                        {fechaDesde ? (
                          <TouchableOpacity
                            style={styles.clearDateButton}
                            onPress={() => setFechaDesde(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Quitar fecha desde"
                            hitSlop={8}
                          >
                            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.dateRangeSeparator}>
                      <Feather name="arrow-right" size={16} color={COLORS.textMuted} />
                    </View>
                    <View style={styles.dateField}>
                      <View style={styles.datePickerRow}>
                        <View style={styles.datePicker}>
                          <DateTimeSelector
                            value={fechaHasta}
                            onChange={setFechaHasta}
                            dateOnly
                            allowPastDates
                            placeholder="Elegir fecha"
                            accessibilityLabel="Filtrar hasta la fecha"
                          />
                        </View>
                        {fechaHasta ? (
                          <TouchableOpacity
                            style={styles.clearDateButton}
                            onPress={() => setFechaHasta(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Quitar fecha hasta"
                            hitSlop={8}
                          >
                            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
                {errorRangoFechas ? (
                  <Text style={styles.dateRangeError}>{errorRangoFechas}</Text>
                ) : null}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryFilters}
                >
                  {categoriasDisponibles.map((categoria) => {
                    const activa = categoriaSeleccionada === categoria;
                    return (
                      <TouchableOpacity
                        key={categoria}
                        style={[styles.categoryChip, activa && styles.categoryChipActive]}
                        onPress={() => setCategoriaSeleccionada(categoria)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: activa }}
                      >
                        <Text style={[styles.categoryChipText, activa && styles.categoryChipTextActive]}>
                          {categoria}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {eventosVisibles.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={34} color={COLORS.textMuted} />
                  <Text style={styles.emptyTitle}>
                    {errorRangoFechas ? 'Revisá el rango de fechas' : 'No encontramos eventos'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {errorRangoFechas
                      ? errorRangoFechas
                      : 'Probá con otro nombre o cambiá los filtros.'}
                  </Text>
                  <TouchableOpacity
                    style={styles.clearFiltersButton}
                    onPress={() => {
                      setBusqueda('');
                      setFechaDesde(null);
                      setFechaHasta(null);
                      setCategoriaSeleccionada('Todas');
                      setFiltroEstado('todos');
                    }}
                    accessibilityRole="button"
                  >
                    <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
                  </TouchableOpacity>
                </View>
              ) : eventosVisibles.map((evento) => {
                const estado = obtenerEstadoEvento(evento, ahora);
                return (
                  <View
                    key={evento.id}
                    style={[
                      styles.eventCard,
                      estado === 'terminados' && styles.endedEventCard,
                    ]}
                  >
                    {evento.imagen ? (
                      <Image source={{ uri: evento.imagen }} style={styles.eventImage} />
                    ) : (
                      <View style={[styles.eventImage, styles.imagePlaceholder]}>
                        <Ionicons name="image-outline" size={28} color={COLORS.textMuted} />
                      </View>
                    )}
                    <View style={styles.eventInfo}>
                      <View style={styles.eventLabels}>
                        <Text style={styles.eventCategory}>{evento.categoria}</Text>
                        {estado !== 'sinFecha' ? (
                          <View
                            style={[
                              styles.statusBadge,
                              estado === 'terminados' && styles.endedStatusBadge,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                estado === 'terminados' && styles.endedStatusBadgeText,
                              ]}
                            >
                              {estado === 'terminados' ? 'TERMINADO' : 'ACTIVO'}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.eventName}>{evento.nombre}</Text>
                      <Text style={styles.eventMeta}>{evento.fechaTexto || evento.fecha}</Text>
                      <Text style={styles.eventMeta}>{evento.ubicacion}</Text>
                    </View>
                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => abrirEdicion(evento)}
                        accessibilityRole="button"
                        accessibilityLabel={`Editar ${evento.nombre}`}
                      >
                        <Feather name="edit-2" size={15} color={COLORS.tertiary} />
                        <Text style={styles.secondaryButtonText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => navigation.navigate('PanelVentas', { eventoId: evento.id })}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver ventas de ${evento.nombre}`}
                      >
                        <Ionicons name="stats-chart-outline" size={15} color={COLORS.textPrimary} />
                        <Text style={styles.primaryButtonText}>Ventas</Text>
                      </TouchableOpacity>
                    </View>
                    {estado === 'terminados' ? (
                      <TouchableOpacity
                        style={styles.repeatButton}
                        onPress={() =>
                          navigation.navigate('OrganizarTab', {
                            repeatEvento: {
                              nombre: evento.nombre,
                              categoria: evento.categoria,
                              ubicacion: evento.ubicacion,
                              direccion: evento.direccion,
                              descripcion: evento.descripcion,
                              imagen: evento.imagen || evento.multimedia?.[0] || '',
                              tiposEntrada: (evento.tiposEntrada || []).map((tipo) => ({
                                nombre: tipo.nombre,
                                precio: tipo.precio,
                                cupo: tipo.cupo,
                              })),
                            },
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Repetir ${evento.nombre}`}
                      >
                        <Feather name="copy" size={14} color={COLORS.tertiary} />
                        <Text style={styles.repeatButtonText}>Repetir evento</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}

      <Modal visible={!!eventoEditando} transparent animationType="fade" onRequestClose={cerrarEdicion}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Editar evento</Text>
              </View>
              <TouchableOpacity
                onPress={cerrarEdicion}
                disabled={isSaving || isPickingImage}
                accessibilityRole="button"
                accessibilityLabel="Cerrar edición"
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {formulario ? (
              <ScrollView
                style={styles.modalFormScroll}
                contentContainerStyle={styles.modalFormContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.fieldLabel}>Foto de portada</Text>
                {formulario.imagen && !formulario.quitarImagen ? (
                  <Image source={{ uri: formulario.imagen }} style={styles.coverPreview} />
                ) : (
                  <View style={[styles.coverPreview, styles.coverPlaceholder]}>
                    <Ionicons name="image-outline" size={28} color={COLORS.textMuted} />
                    <Text style={styles.coverPlaceholderText}>Sin foto de portada</Text>
                  </View>
                )}
                <View style={styles.coverActions}>
                  <TouchableOpacity
                    style={styles.coverButton}
                    onPress={seleccionarImagen}
                    disabled={isSaving || isPickingImage}
                    accessibilityRole="button"
                    accessibilityLabel="Cambiar foto de portada"
                  >
                    {isPickingImage ? (
                      <LoadingSpinner size={16} />
                    ) : (
                      <>
                        <Feather name="upload" size={14} color={COLORS.tertiary} />
                        <Text style={styles.coverButtonText}>
                          {formulario.imagen && !formulario.quitarImagen
                            ? 'Cambiar foto'
                            : 'Elegir foto'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {formulario.imagen && !formulario.quitarImagen ? (
                    <TouchableOpacity
                      style={styles.removeCoverButton}
                      onPress={() =>
                        setFormulario((prev) => ({
                          ...prev,
                          imagen: '',
                          imagenSeleccionada: null,
                          quitarImagen: true,
                        }))
                      }
                      disabled={isSaving || isPickingImage}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar foto de portada"
                    >
                      <Text style={styles.removeCoverButtonText}>Quitar foto</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.coverHint}>JPEG, PNG o WebP de hasta 5 MB.</Text>
                <Text style={styles.fieldLabel}>Fecha y horario</Text>
                <DateTimeSelector
                  value={formulario.fecha}
                  disabled={isSaving || isPickingImage}
                  accessibilityLabel="Modificar fecha y horario del evento"
                  onChange={(fecha) =>
                    setFormulario((prev) => ({
                      ...prev,
                      fecha,
                      fechaModificada: true,
                    }))
                  }
                />
                <Text style={styles.fieldLabel}>Nombre</Text>
                <TextInput
                  style={styles.input}
                  value={formulario.nombre}
                  onChangeText={(nombre) => setFormulario((prev) => ({ ...prev, nombre }))}
                  maxLength={100}
                />
                <Text style={styles.fieldLabel}>Ubicación</Text>
                <TextInput
                  style={styles.input}
                  value={formulario.ubicacion}
                  onChangeText={(ubicacion) => setFormulario((prev) => ({ ...prev, ubicacion }))}
                  maxLength={160}
                />
                <Text style={styles.fieldLabel}>Descripción</Text>
                <TextInput
                  style={[styles.input, styles.descriptionInput]}
                  value={formulario.descripcion}
                  onChangeText={(descripcion) => setFormulario((prev) => ({ ...prev, descripcion }))}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.disabled]}
                  onPress={guardarCambios}
                  disabled={isSaving || isPickingImage}
                  accessibilityRole="button"
                >
                  {isSaving ? (
                    <LoadingSpinner size={18} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Guardar cambios</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  pageHeading: { gap: 4, marginBottom: 4 },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  filters: { gap: 10 },
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
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: 13 },
  filterTabs: { flexDirection: 'row', gap: 8 },
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
    borderColor: 'rgba(255,255,255,0.08)',
  },
  filterTabActive: {
    backgroundColor: COLORS.accentElectric,
    borderColor: COLORS.accentElectric,
  },
  filterTabText: { color: COLORS.badgeCyanGlow, fontSize: 12, fontWeight: '700' },
  filterTabTextActive: { color: COLORS.textPrimary },
  filterCountBadge: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  filterCountBadgeActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  filterCount: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  filterCountActive: { color: COLORS.textPrimary },
  dateRange: { gap: 5 },
  dateRangeLabels: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateRangeFields: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateRangeArrowSpacer: { width: 16 },
  dateField: { flex: 1, minWidth: 0 },
  dateFieldLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  datePickerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  datePicker: { flex: 1, minWidth: 0 },
  clearDateButton: { width: 22, alignItems: 'center', justifyContent: 'center' },
  dateRangeSeparator: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateRangeError: { color: COLORS.statusDanger, fontSize: 11 },
  categoryFilters: { gap: 8 },
  categoryChip: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  categoryChipActive: {
    backgroundColor: COLORS.surfaceContainerHigh,
    borderColor: COLORS.tertiary,
  },
  categoryChipText: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  categoryChipTextActive: { color: COLORS.tertiary },
  eventCard: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  endedEventCard: {
    backgroundColor: COLORS.surfaceContainer,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  eventImage: { width: '100%', height: 150 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceContainerLow },
  eventInfo: { padding: 14, gap: 5 },
  eventLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eventCategory: { color: COLORS.tertiary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,245,160,0.12)',
  },
  statusBadgeText: { color: COLORS.statusSuccess, fontSize: 9, fontWeight: '800' },
  endedStatusBadge: { backgroundColor: 'rgba(138,126,166,0.18)' },
  endedStatusBadgeText: { color: COLORS.textMuted },
  eventName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  eventMeta: { color: COLORS.textMuted, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
  repeatButton: {
    minHeight: 36,
    marginHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  repeatButtonText: { color: COLORS.tertiary, fontSize: 11, fontWeight: '700' },
  secondaryButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  secondaryButtonText: { color: COLORS.tertiary, fontSize: 12, fontWeight: '700' },
  primaryButton: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.accentElectric,
  },
  primaryButtonText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 56 },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700' },
  clearFiltersButton: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  clearFiltersText: { color: COLORS.tertiary, fontSize: 12, fontWeight: '700' },
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(4,8,16,0.78)' },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    alignSelf: 'center',
    padding: 18,
    gap: 10,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalFormScroll: { flexShrink: 1 },
  modalFormContent: { gap: 10, paddingBottom: 2 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  modalSubtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
  coverPreview: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverPlaceholderText: { color: COLORS.textMuted, fontSize: 11 },
  coverActions: { flexDirection: 'row', gap: 10 },
  coverButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  coverButtonText: { color: COLORS.tertiary, fontSize: 11, fontWeight: '700' },
  removeCoverButton: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  removeCoverButtonText: { color: COLORS.statusDanger, fontSize: 11, fontWeight: '700' },
  coverHint: { color: COLORS.textMuted, fontSize: 10 },
  input: {
    minHeight: 42,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 9,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surfaceContainerLow,
    fontSize: 13,
  },
  descriptionInput: { minHeight: 90, textAlignVertical: 'top' },
  saveButton: {
    minHeight: 44,
    marginTop: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentElectric,
  },
  disabled: { opacity: 0.6 },
});
