import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/loading/Spinners';
import DateTimeSelector, { formatearFechaEvento } from '../components/DateTimeSelector';

export default function CrearEventoScreen({ navigation }) {
  const { crearEvento, categorias } = useApp();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPickingImages, setIsPickingImages] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [errores, setErrores] = useState({});
  const [resultadoPublicacion, setResultadoPublicacion] = useState(null);
  const [fechaEvento, setFechaEvento] = useState(null);

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [tiposEntrada, setTiposEntrada] = useState([
    { id: String(Date.now()), nombre: '', precio: '', cupo: '' },
  ]);

  const cambiarCampo = (setter, key, value) => {
    setter(value);
    setErrores((prev) => {
      if (!prev[key]) return prev;
      const nuevosErrores = { ...prev };
      delete nuevosErrores[key];
      return nuevosErrores;
    });
  };

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
    setErrores((prev) => {
      const key = `tipo-${id}-${field}`;
      if (!prev[key]) return prev;
      const nuevosErrores = { ...prev };
      delete nuevosErrores[key];
      return nuevosErrores;
    });
  };

  const handleSeleccionarImagenes = async () => {
    if (imagenes.length >= 1) return;

    setIsPickingImages(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        selectionLimit: 1,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.length) {
        const validAssets = [];
        const rejectedAssets = [];
        for (const asset of result.assets) {
          const fileExtension = asset.fileName?.split('.').pop()?.toLowerCase();
          const mimeType =
            asset.mimeType ||
            ({
              jpg: 'image/jpeg',
              jpeg: 'image/jpeg',
              png: 'image/png',
              webp: 'image/webp',
            }[fileExtension] || '');
          const supportedType =
            !mimeType || ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType);
          const withinSizeLimit = !asset.fileSize || asset.fileSize <= 5 * 1024 * 1024;
          if (supportedType && withinSizeLimit) validAssets.push(asset);
          else rejectedAssets.push(asset);
        }

        if (rejectedAssets.length) {
          Alert.alert(
            'La foto no se pudo agregar',
            'Se aceptan imágenes JPEG, PNG o WebP de hasta 5 MB.'
          );
        }
        if (validAssets.length) {
          setImagenes([validAssets[0]]);
        }
      }
    } catch (error) {
      Alert.alert('No se pudieron seleccionar las fotos', error.message);
    } finally {
      setIsPickingImages(false);
    }
  };

  const handleQuitarImagen = (uri) => {
    setImagenes((previous) => previous.filter((imagen) => imagen.uri !== uri));
  };

  const reiniciarFormulario = () => {
    setNombre('');
    setCategoria('');
    setFechaEvento(null);
    setUbicacion('');
    setDireccion('');
    setDescripcion('');
    setImagenes([]);
    setTiposEntrada([{ id: String(Date.now()), nombre: '', precio: '', cupo: '' }]);
    setErrores({});
  };

  const cerrarResultado = () => setResultadoPublicacion(null);

  const verEventoCreado = () => {
    const eventoId = resultadoPublicacion?.eventoId;
    cerrarResultado();
    if (eventoId) navigation.navigate('EventosTab', { editEventoId: eventoId });
  };

  const handlePublicar = async () => {
    const nuevosErrores = {};
    if (!nombre.trim()) nuevosErrores.nombre = 'Debe completar el nombre del evento.';
    if (!categoria) nuevosErrores.categoria = 'Debe seleccionar una categoría.';
    if (!fechaEvento) nuevosErrores.fechaTexto = 'Debe seleccionar la fecha y el horario.';
    if (!ubicacion.trim()) nuevosErrores.ubicacion = 'Debe completar el lugar del evento.';
    if (!direccion.trim()) nuevosErrores.direccion = 'Debe completar la dirección.';
    if (!descripcion.trim()) nuevosErrores.descripcion = 'Debe completar la descripción del evento.';

    tiposEntrada.forEach((tipo) => {
      if (!tipo.nombre.trim()) {
        nuevosErrores[`tipo-${tipo.id}-nombre`] = 'Debe completar el nombre del tipo de entrada.';
      }
      const precio = Number(tipo.precio);
      if (!tipo.precio.trim()) {
        nuevosErrores[`tipo-${tipo.id}-precio`] = 'Debe completar el precio de la entrada.';
      } else if (!Number.isFinite(precio) || precio <= 0) {
        nuevosErrores[`tipo-${tipo.id}-precio`] = 'Ingresá un precio mayor a 0.';
      }
      const cupo = Number(tipo.cupo);
      if (!tipo.cupo.trim()) {
        nuevosErrores[`tipo-${tipo.id}-cupo`] = 'Debe completar el cupo máximo.';
      } else if (!Number.isInteger(cupo) || cupo <= 0) {
        nuevosErrores[`tipo-${tipo.id}-cupo`] = 'Ingresá un cupo entero mayor a 0.';
      }
    });

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }

    const tiposFormateados = tiposEntrada.map((t, idx) => ({
      id: `te-new-${idx}-${Date.now()}`,
      nombre: t.nombre.trim(),
      descripcion: `Acceso categoría ${t.nombre.trim()}`,
      precio: Number(t.precio),
      cupo: Number(t.cupo),
      disponibles: Number(t.cupo),
    }));

    const nuevoEvento = {
      nombre: nombre.trim(),
      categoria,
      fecha: fechaEvento.toISOString(),
      fechaTexto: formatearFechaEvento(fechaEvento),
      apertura: '18:00 hs',
      ubicacion: ubicacion.trim(),
      direccion: direccion.trim(),
      descripcion: descripcion.trim(),
      imagenes,
      tiposEntrada: tiposFormateados,
    };

    setIsPublishing(true);
    try {
      const res = await crearEvento(nuevoEvento);
      if (!res.success) throw new Error(res.error || 'No se pudo publicar el evento.');
      reiniciarFormulario();
      setResultadoPublicacion({
        tipo: 'exito',
        mensaje: 'Tu evento ya está disponible en la cartelera de AI Ticket It.',
        eventoId: res.evento?.id,
      });
    } catch (error) {
      setResultadoPublicacion({
        tipo: 'error',
        mensaje: error.message || 'Ocurrió un error durante la publicación. Intentá nuevamente.',
      });
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
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre del Evento</Text>
            <TextInput
              style={[styles.textInput, errores.nombre && styles.inputError]}
              value={nombre}
              onChangeText={(value) => cambiarCampo(setNombre, 'nombre', value)}
              placeholder="Ej. Recital Acústico 2026"
              placeholderTextColor={COLORS.textMuted}
            />
            {errores.nombre ? <Text style={styles.errorLabel}>{errores.nombre}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Categoría</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={errores.categoria && styles.catScrollError}
              contentContainerStyle={styles.catChipsRow}
            >
              {categorias.map((cat) => {
                const isSelected = categoria === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, isSelected && styles.catChipSelected]}
                    onPress={() => cambiarCampo(setCategoria, 'categoria', cat)}
                  >
                    <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {errores.categoria ? <Text style={styles.errorLabel}>{errores.categoria}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Fecha y Horario</Text>
            <DateTimeSelector
              value={fechaEvento}
              error={errores.fechaTexto}
              disabled={isPublishing}
              onChange={(fecha) => cambiarCampo(setFechaEvento, 'fechaTexto', fecha)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lugar / Predio</Text>
            <TextInput
              style={[styles.textInput, errores.ubicacion && styles.inputError]}
              value={ubicacion}
              onChangeText={(value) => cambiarCampo(setUbicacion, 'ubicacion', value)}
              placeholder="Ej. Estadio Central"
              placeholderTextColor={COLORS.textMuted}
            />
            {errores.ubicacion ? <Text style={styles.errorLabel}>{errores.ubicacion}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Dirección</Text>
            <TextInput
              style={[styles.textInput, errores.direccion && styles.inputError]}
              value={direccion}
              onChangeText={(value) => cambiarCampo(setDireccion, 'direccion', value)}
              placeholder="Ej. Av. Corrientes 1234, CABA"
              placeholderTextColor={COLORS.textMuted}
            />
            {errores.direccion ? <Text style={styles.errorLabel}>{errores.direccion}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descripción del Evento</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, errores.descripcion && styles.inputError]}
              value={descripcion}
              onChangeText={(value) => cambiarCampo(setDescripcion, 'descripcion', value)}
              placeholder="Describí los artistas, propuesta y normas..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />
            {errores.descripcion ? <Text style={styles.errorLabel}>{errores.descripcion}</Text> : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.imagePickerHeader}>
              <View>
                <Text style={styles.inputLabel}>Foto del evento</Text>
                <Text style={styles.imagePickerHint}>Una foto JPEG, PNG o WebP (hasta 5 MB)</Text>
              </View>
            </View>
            {imagenes.length > 0 ? (
              <View style={styles.selectedImages}>
                {imagenes.map((imagen) => (
                  <View key={imagen.uri} style={styles.selectedImageItem}>
                    <Image source={{ uri: imagen.uri }} style={styles.selectedImagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleQuitarImagen(imagen.uri)}
                      disabled={isPublishing}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar foto seleccionada"
                    >
                      <Ionicons name="close" size={14} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.imagePickerButton,
                  (isPickingImages || isPublishing) && styles.imagePickerButtonDisabled,
                ]}
                onPress={handleSeleccionarImagenes}
                disabled={isPickingImages || isPublishing}
                accessibilityRole="button"
                accessibilityLabel="Buscar fotos del evento en el dispositivo"
              >
                <Feather name="upload-cloud" size={30} color={COLORS.tertiary} />
                <Text style={styles.imagePickerButtonText}>
                  {isPickingImages ? 'ABRIENDO...' : 'BUSCAR FOTOS'}
                </Text>
                <Text style={styles.imagePickerDropHint}>
                  Seleccioná una imágen deste la galería de tu celular.
                </Text>
              </TouchableOpacity>
            )}
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
                style={[styles.tipoInput, errores[`tipo-${tipo.id}-nombre`] && styles.inputError]}
                value={tipo.nombre}
                onChangeText={(val) => handleUpdateTipo(tipo.id, 'nombre', val)}
                placeholder="Nombre (ej. Platea VIP, General)"
                placeholderTextColor={COLORS.textMuted}
              />
              {errores[`tipo-${tipo.id}-nombre`] ? (
                <Text style={styles.errorLabel}>{errores[`tipo-${tipo.id}-nombre`]}</Text>
              ) : null}

              <View style={styles.tipoInlineRow}>
                <View style={styles.tipoHalfInputBox}>
                  <Text style={styles.subInputLabel}>Precio ($ ARS):</Text>
                  <TextInput
                    style={[styles.tipoInput, errores[`tipo-${tipo.id}-precio`] && styles.inputError]}
                    value={tipo.precio}
                    onChangeText={(val) => handleUpdateTipo(tipo.id, 'precio', val)}
                    placeholder="8000"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                  {errores[`tipo-${tipo.id}-precio`] ? (
                    <Text style={styles.errorLabel}>{errores[`tipo-${tipo.id}-precio`]}</Text>
                  ) : null}
                </View>

                <View style={styles.tipoHalfInputBox}>
                  <Text style={styles.subInputLabel}>Cupo Máximo:</Text>
                  <TextInput
                    style={[styles.tipoInput, errores[`tipo-${tipo.id}-cupo`] && styles.inputError]}
                    value={tipo.cupo}
                    onChangeText={(val) => handleUpdateTipo(tipo.id, 'cupo', val)}
                    placeholder="150"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                  />
                  {errores[`tipo-${tipo.id}-cupo`] ? (
                    <Text style={styles.errorLabel}>{errores[`tipo-${tipo.id}-cupo`]}</Text>
                  ) : null}
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
      <Modal
        visible={!!resultadoPublicacion}
        transparent
        animationType="fade"
        onRequestClose={cerrarResultado}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.resultModal}>
            <View
              style={[
                styles.resultIcon,
                resultadoPublicacion?.tipo === 'exito' ? styles.successIcon : styles.failureIcon,
              ]}
            >
              <Ionicons
                name={resultadoPublicacion?.tipo === 'exito' ? 'checkmark' : 'alert'}
                size={28}
                color={COLORS.textPrimary}
              />
            </View>
            <Text style={styles.resultTitle}>
              {resultadoPublicacion?.tipo === 'exito'
                ? '¡Evento publicado!'
                : 'No se pudo publicar'}
            </Text>
            <Text style={styles.resultMessage}>{resultadoPublicacion?.mensaje}</Text>
            <View style={styles.resultActions}>
              {resultadoPublicacion?.tipo === 'exito' ? (
                <TouchableOpacity
                  style={styles.secondaryModalButton}
                  onPress={cerrarResultado}
                  accessibilityRole="button"
                >
                  <Text style={styles.secondaryModalButtonText}>Cerrar</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.primaryModalButton}
                onPress={
                  resultadoPublicacion?.tipo === 'exito' ? verEventoCreado : cerrarResultado
                }
                accessibilityRole="button"
              >
                <Text style={styles.primaryModalButtonText}>
                  {resultadoPublicacion?.tipo === 'exito' ? 'Ver evento' : 'Cerrar'}
                </Text>
              </TouchableOpacity>
            </View>
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
  inputError: {
    borderWidth: 1,
    borderColor: COLORS.statusDanger,
  },
  errorLabel: {
    color: COLORS.statusDanger,
    fontSize: 11,
    marginTop: 2,
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
  imagePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  imagePickerHint: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 3,
  },
  imagePickerButton: {
    minHeight: 116,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#263A55',
    borderColor: 'rgba(32, 217, 249, 0.72)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  imagePickerButtonDisabled: {
    opacity: 0.55,
  },
  imagePickerButtonText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  imagePickerDropHint: {
    color: '#B7C8E1',
    fontSize: 10,
    textAlign: 'center',
  },
  selectedImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  selectedImageItem: {
    position: 'relative',
  },
  selectedImagePreview: {
    width: 76,
    height: 68,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  removeImageButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.statusDanger,
  },
  catChipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  catScrollError: {
    borderWidth: 1,
    borderColor: COLORS.statusDanger,
    borderRadius: 14,
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
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    padding: 24,
  },
  resultModal: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    borderColor: COLORS.borderGlass,
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
  },
  resultIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successIcon: {
    backgroundColor: COLORS.statusSuccess,
  },
  failureIcon: {
    backgroundColor: COLORS.statusDanger,
  },
  resultTitle: {
    color: COLORS.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultMessage: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  resultActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  primaryModalButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.accentElectric,
    borderRadius: 22,
    paddingHorizontal: 12,
  },
  primaryModalButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryModalButton: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceContainerHigh,
    borderRadius: 22,
    paddingHorizontal: 12,
  },
  secondaryModalButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
