import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { CATEGORIAS } from '../data/mockData';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/loading/Spinners';

export default function CrearEventoScreen({ navigation }) {
  const { crearEvento } = useApp();
  const [isPublishing, setIsPublishing] = useState(false);

  const [nombre, setNombre] = useState('Festival Indie Primavera 2026');
  const [categoria, setCategoria] = useState('Festivales');
  const [fechaTexto, setFechaTexto] = useState('Sábado, 21 de Noviembre 2026 • 19:00 hs');
  const [ubicacion, setUbicacion] = useState('Ciudad Universitaria • Pabellón 3');
  const [direccion, setDireccion] = useState('Intendente Güiraldes 2160, Núñez, CABA');
  const [descripcion, setDescripcion] = useState(
    'Gran encuentro de bandas independientes universitarias y feria de diseño emergente.'
  );

  // Dynamic ticket types list
  const [tiposEntrada, setTiposEntrada] = useState([
    { id: '1', nombre: 'General Anticipada', precio: '8000', cupo: '200' },
    { id: '2', nombre: 'Acceso VIP + Merch', precio: '15000', cupo: '50' },
  ]);

  const handleAddTipo = () => {
    setTiposEntrada((prev) => [
      ...prev,
      { id: String(Date.now()), nombre: '', precio: '', cupo: '' },
    ]);
  };

  const handleRemoveTipo = (id) => {
    if (tiposEntrada.length <= 1) {
      Alert.alert('Atención', 'El evento debe contar al menos con un tipo de entrada.');
      return;
    }
    setTiposEntrada((prev) => prev.filter((t) => t.id !== id));
  };

  const handleUpdateTipo = (id, field, value) => {
    setTiposEntrada((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleSugerirIA = () => {
    setNombre('Cosmos ElectroFest UTN 2026');
    setDescripcion(
      'Experiencia inmersiva que combina arte sonoro interactivo con tecnología de inteligencia artificial generativa en vivo.'
    );
    Alert.alert('Sugerencia de IA ✨', 'Se han optimizado el título y la descripción del evento.');
  };

  const handlePublicar = async () => {
    if (!nombre.trim() || !ubicacion.trim()) {
      Alert.alert('Campos incompletos', 'Por favor completá el nombre y ubicación del evento.');
      return;
    }

    // Format ticket types
    const tiposFormateados = tiposEntrada.map((t, idx) => ({
      id: `te-new-${idx}-${Date.now()}`,
      nombre: t.nombre || `Entrada ${idx + 1}`,
      descripcion: `Acceso categoría ${t.nombre}`,
      precio: Number(t.precio) || 5000,
      cupo: Number(t.cupo) || 100,
      disponibles: Number(t.cupo) || 100,
    }));

    const nuevoEvento = {
      nombre,
      categoria,
      fecha: '2026-11-21T19:00:00',
      fechaTexto,
      apertura: '18:00 hs',
      ubicacion,
      direccion,
      descripcion,
      imagen: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      tiposEntrada: tiposFormateados,
    };

    setIsPublishing(true);
    try {
      const res = await crearEvento(nuevoEvento);
      if (!res.success) throw new Error(res.error || 'No se pudo publicar el evento.');
      Alert.alert('¡Evento Publicado!', 'Tu evento ya está disponible en la cartelera de AI Ticket It.', [
        { text: 'Ver en Cartelera', onPress: () => navigation.navigate('ExplorarTab') },
      ]);
    } catch (error) {
      Alert.alert('No se pudo publicar el evento', error.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Crear Evento" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerTitleBox}>
          <Text style={styles.pageTitle}>Publicar Nuevo Evento</Text>
          <Text style={styles.pageSubtitle}>
            Configura los detalles, cupos y categorías comerciales para tu audiencia.
          </Text>
        </View>

        {/* Section 1: Main Info */}
        <View style={styles.cardSection}>
          <View style={styles.cardSectionHeader}>
            <Text style={styles.cardSectionTitle}>1. Información Principal</Text>
            <TouchableOpacity style={styles.iaButton} onPress={handleSugerirIA} activeOpacity={0.8}>
              <Ionicons name="sparkles" size={14} color={COLORS.accentElectric} />
              <Text style={styles.iaButtonText}>Sugerir con IA ✨</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre del Evento</Text>
            <TextInput
              style={styles.textInput}
              value={nombre}
              onChangeText={setNombre}
              placeholder="Ej. Recital Acústico 2026"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catChipsRow}>
              {CATEGORIAS.filter((c) => c !== 'Todos').map((cat) => {
                const isSelected = categoria === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, isSelected && styles.catChipSelected]}
                    onPress={() => setCategoria(cat)}
                  >
                    <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Fecha y Horario</Text>
            <TextInput
              style={styles.textInput}
              value={fechaTexto}
              onChangeText={setFechaTexto}
              placeholder="Ej. Sábado, 21 de Noviembre 2026 • 20:00 hs"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lugar / Predio</Text>
            <TextInput
              style={styles.textInput}
              value={ubicacion}
              onChangeText={setUbicacion}
              placeholder="Ej. Estadio Central"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Dirección</Text>
            <TextInput
              style={styles.textInput}
              value={direccion}
              onChangeText={setDireccion}
              placeholder="Ej. Av. Corrientes 1234, CABA"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descripción del Evento</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Describí los artistas, propuesta y normas..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Section 2: Ticket Types & Quotas (TP Explicit Requirement) */}
        <View style={styles.cardSection}>
          <View style={styles.cardSectionHeader}>
            <Text style={styles.cardSectionTitle}>2. Tipos de Entrada y Cupos</Text>
            <TouchableOpacity style={styles.addTypeBtn} onPress={handleAddTipo} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color={COLORS.tertiary} />
              <Text style={styles.addTypeBtnText}>Agregar Tipo</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSectionSubtitle}>
            Cada tipo de entrada debe contar con su propio precio y cupo disponible:
          </Text>

          {tiposEntrada.map((tipo, idx) => (
            <View key={tipo.id} style={styles.tipoRowCard}>
              <View style={styles.tipoHeader}>
                <Text style={styles.tipoNumber}>Entrada #{idx + 1}</Text>
                {tiposEntrada.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveTipo(tipo.id)}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.statusDanger} />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.tipoInput}
                value={tipo.nombre}
                onChangeText={(val) => handleUpdateTipo(tipo.id, 'nombre', val)}
                placeholder="Nombre (ej. Platea VIP, General)"
                placeholderTextColor={COLORS.textMuted}
              />

              <View style={styles.tipoInlineRow}>
                <View style={styles.tipoHalfInputBox}>
                  <Text style={styles.subInputLabel}>Precio ($ ARS):</Text>
                  <TextInput
                    style={styles.tipoInput}
                    value={tipo.precio}
                    onChangeText={(val) => handleUpdateTipo(tipo.id, 'precio', val)}
                    placeholder="8000"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.tipoHalfInputBox}>
                  <Text style={styles.subInputLabel}>Cupo Máximo:</Text>
                  <TextInput
                    style={styles.tipoInput}
                    value={tipo.cupo}
                    onChangeText={(val) => handleUpdateTipo(tipo.id, 'cupo', val)}
                    placeholder="150"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.publishBtn, isPublishing && styles.publishBtnDisabled]}
          onPress={handlePublicar}
          disabled={isPublishing}
          activeOpacity={0.85}
        >
          {isPublishing ? (
            <>
              <LoadingSpinner size={18} style={styles.buttonSpinner} />
              <Text style={styles.publishBtnText}>PUBLICANDO...</Text>
            </>
          ) : (
            <>
              <Text style={styles.publishBtnText}>PUBLICAR EVENTO</Text>
              <Feather name="arrow-right" size={18} color={COLORS.textPrimary} />
            </>
          )}
        </TouchableOpacity>
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
  headerTitleBox: {
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
  cardSection: {
    backgroundColor: COLORS.surfaceCard,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardSectionSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  iaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 0, 127, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  iaButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.accentElectric,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  textInput: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  catChipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  catChipSelected: {
    backgroundColor: COLORS.secondaryContainer,
  },
  catChipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  catChipTextSelected: {
    color: COLORS.textPrimary,
    fontWeight: '700',
  },
  addTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(32, 217, 249, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  addTypeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.tertiary,
  },
  tipoRowCard: {
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  tipoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipoNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
  },
  tipoInput: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: COLORS.textPrimary,
    fontSize: 12,
  },
  tipoInlineRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tipoHalfInputBox: {
    flex: 1,
    gap: 4,
  },
  subInputLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.accentElectric,
    height: 52,
    borderRadius: 26,
    shadowColor: COLORS.accentElectric,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
    marginTop: 8,
  },
  publishBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  publishBtnDisabled: {
    opacity: 0.65,
  },
  buttonSpinner: {
    width: 18,
    padding: 0,
  },
});
