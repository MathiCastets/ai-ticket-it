import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { commonStyles } from '../theme/commonStyles';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import SearchBar from '../components/SearchBar';
import DateTimeSelector, { formatearFechaEvento } from '../components/DateTimeSelector';
import AccessDeniedView from '../components/AccessDeniedView';
import { useNotification } from '../components/NotificationProvider';
import OrganizadorEventoCard from '../components/eventos/OrganizadorEventoCard';
import EditarEventoModal from '../components/eventos/EditarEventoModal';

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
  const { notify } = useNotification();
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
    const estado = obtenerEstadoEvento(evento, Date.now());
    if (estado === 'terminados' || evento.cerrado) {
      notify({
        title: 'Evento no editable',
        message: 'No se puede editar un evento que ya ha finalizado o está cerrado.',
        type: 'warning',
      });
      return;
    }
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

  if (currentUser?.rol !== 'organizador') {
    return (
      <AccessDeniedView
        headerTitle="Panel de Eventos"
        headerSubtitle="Acceso Restringido"
        actionText="Volver a Explorar"
        onBack={() => navigation.navigate('MainTabs')}
        navigation={navigation}
      />
    );
  }

  const cerrarEdicion = () => {
    if (isSaving || isPickingImage) return;
    setEventoEditando(null);
    setFormulario(null);
  };

  const duplicarEvento = (evento) => {
    navigation.navigate('OrganizarTab', {
      duplicateEvento: {
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
    });
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
        notify({
          title: 'La foto no se pudo agregar',
          message: 'Se aceptan imágenes JPEG, PNG o WebP de hasta 5 MB.',
          type: 'warning',
        });
        return;
      }

      setFormulario((prev) => ({
        ...prev,
        imagen: imagen.uri,
        imagenSeleccionada: imagen,
        quitarImagen: false,
      }));
    } catch (error) {
      notify({ title: 'No se pudo seleccionar la foto', message: error.message, type: 'error' });
    } finally {
      setIsPickingImage(false);
    }
  };

  const guardarCambios = async () => {
    if (!eventoEditando || !formulario) return;
    const estadoActual = obtenerEstadoEvento(eventoEditando, Date.now());
    if (estadoActual === 'terminados' || eventoEditando.cerrado) {
      notify({
        title: 'Evento no editable',
        message: 'No se puede editar un evento que ya ha finalizado o está cerrado.',
        type: 'warning',
      });
      cerrarEdicion();
      return;
    }
    if (!formulario.nombre.trim()) {
      notify({
        title: 'Falta el nombre',
        message: 'El evento debe tener un nombre.',
        type: 'warning',
      });
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
      notify({
        title: 'No se pudieron guardar los cambios',
        message: error.message,
        type: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={commonStyles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Mis Eventos" />
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
                <SearchBar
                  value={busqueda}
                  onChangeText={setBusqueda}
                  placeholder="Buscar por nombre o categoría..."
                  accessibilityLabel="Buscar eventos por nombre o categoría"
                />
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
                  <Text style={styles.dateRangeError} accessibilityRole="alert" accessibilityLiveRegion="polite">
                    {errorRangoFechas}
                  </Text>
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
                  <OrganizadorEventoCard
                    key={evento.id}
                    evento={evento}
                    estado={estado}
                    onEdit={abrirEdicion}
                    onViewSales={(item) => navigation.navigate('PanelVentas', { eventoId: item.id })}
                    onDuplicate={duplicarEvento}
                  />
                );
              })}
            </>
          )}
      </ScrollView>

      <EditarEventoModal
        visible={!!eventoEditando}
        formulario={formulario}
        setFormulario={setFormulario}
        isSaving={isSaving}
        isPickingImage={isPickingImage}
        onSelectImage={seleccionarImagen}
        onClose={cerrarEdicion}
        onSave={guardarCambios}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 36, gap: 14 },
  pageHeading: { gap: 4, marginBottom: 4 },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  subtitle: { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
  filters: { gap: 10 },
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
});
