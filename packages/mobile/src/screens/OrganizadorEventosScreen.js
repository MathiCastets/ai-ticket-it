import React, { useState } from 'react';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/loading/Spinners';
import useMockLoading from '../hooks/useMockLoading';

const crearFormulario = (evento) => ({
  nombre: evento.nombre || '',
  descripcion: evento.descripcion || '',
  ubicacion: evento.ubicacion || '',
});

export default function OrganizadorEventosScreen({ navigation }) {
  const { eventos, currentUser, actualizarEvento } = useApp();
  const isLoading = useMockLoading();
  const eventosDelUsuario = eventos.filter((evento) => evento.organizadorId === currentUser.id);
  const [eventoEditando, setEventoEditando] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const abrirEdicion = (evento) => {
    setEventoEditando(evento);
    setFormulario(crearFormulario(evento));
  };

  const cerrarEdicion = () => {
    if (isSaving) return;
    setEventoEditando(null);
    setFormulario(null);
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
            <Text style={styles.subtitle}>Administrá la información y revisá el rendimiento de cada uno.</Text>
          </View>

          {eventosDelUsuario.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Todavía no publicaste eventos</Text>
              <Text style={styles.subtitle}>Usá Organizar para crear tu primer evento.</Text>
            </View>
          ) : (
            eventosDelUsuario.map((evento) => (
              <View key={evento.id} style={styles.eventCard}>
                {evento.imagen ? (
                  <Image source={{ uri: evento.imagen }} style={styles.eventImage} />
                ) : (
                  <View style={[styles.eventImage, styles.imagePlaceholder]}>
                    <Ionicons name="image-outline" size={28} color={COLORS.textMuted} />
                  </View>
                )}
                <View style={styles.eventInfo}>
                  <Text style={styles.eventCategory}>{evento.categoria}</Text>
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
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={!!eventoEditando} transparent animationType="fade" onRequestClose={cerrarEdicion}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Editar evento</Text>
                <Text style={styles.modalSubtitle}>Los cambios se guardan en el backend.</Text>
              </View>
              <TouchableOpacity
                onPress={cerrarEdicion}
                disabled={isSaving}
                accessibilityRole="button"
                accessibilityLabel="Cerrar edición"
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {formulario ? (
              <>
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
                  disabled={isSaving}
                  accessibilityRole="button"
                >
                  {isSaving ? (
                    <LoadingSpinner size={18} />
                  ) : (
                    <Text style={styles.primaryButtonText}>Guardar cambios</Text>
                  )}
                </TouchableOpacity>
              </>
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
  eventCard: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  eventImage: { width: '100%', height: 150 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surfaceContainerLow },
  eventInfo: { padding: 14, gap: 5 },
  eventCategory: { color: COLORS.tertiary, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  eventName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  eventMeta: { color: COLORS.textMuted, fontSize: 11 },
  actions: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingBottom: 14 },
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
  modalBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(4,8,16,0.78)' },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    padding: 18,
    gap: 10,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
  modalSubtitle: { color: COLORS.textMuted, fontSize: 11, marginTop: 3 },
  fieldLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: '700' },
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
