import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { commonStyles } from '../theme/commonStyles';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/loading/Spinners';
import DateTimeSelector, { formatearFechaEvento } from '../components/DateTimeSelector';
import AccessDeniedView from '../components/AccessDeniedView';
import { useNotification } from '../components/NotificationProvider';
import TipoEntradaFormCard from '../components/eventos/TipoEntradaFormCard';
import PublicacionResultadoModal from '../components/eventos/PublicacionResultadoModal';

export default function CrearEventoScreen({ navigation, route }) {
  const { crearEvento, categorias, currentUser } = useApp();
  const { notify } = useNotification();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPickingImages, setIsPickingImages] = useState(false);
  const [imagenes, setImagenes] = useState([]);
  const [imagenExistente, setImagenExistente] = useState('');
  const [errores, setErrores] = useState({});
  const [resultadoPublicacion, setResultadoPublicacion] = useState(null);
  const [fechaEvento, setFechaEvento] = useState(null);
  const [modoDuplicar, setModoDuplicar] = useState(false);

  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ubicacion, setUbicacion] = useState('');
  const [direccion, setDireccion] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const [tiposEntrada, setTiposEntrada] = useState([
    { id: String(Date.now()), nombre: '', precio: '', cupo: '' },
  ]);

  const scrollViewRef = useRef(null);
  const sectionOffsets = useRef({});
  const fieldOffsets = useRef({});
  const tipoOffsets = useRef({});
  const activeTargetY = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const eventoMostrar = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const eventoOcultar = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const mostrarSub = Keyboard.addListener(eventoMostrar, (e) => {
      const altura = e?.endCoordinates?.height || 280;
      setKeyboardHeight(altura);

      if (activeTargetY.current !== null) {
        setTimeout(() => {
          if (activeTargetY.current !== null) {
            scrollViewRef.current?.scrollTo({
              y: activeTargetY.current,
              animated: true,
            });
          }
        }, Platform.OS === 'android' ? 100 : 50);
      }
    });

    const ocultarSub = Keyboard.addListener(eventoOcultar, () => {
      setKeyboardHeight(0);
      activeTargetY.current = null;
    });

    return () => {
      mostrarSub.remove();
      ocultarSub.remove();
    };
  }, []);

  useEffect(() => {
    const evento = route?.params?.duplicateEvento;
    if (!evento) return;

    setModoDuplicar(true);
    setNombre(evento.nombre || '');
    setCategoria(evento.categoria || '');
    setFechaEvento(null);
    setUbicacion(evento.ubicacion || '');
    setDireccion(evento.direccion || '');
    setDescripcion(evento.descripcion || '');
    setImagenExistente(evento.imagen || '');
    setImagenes([]);
    setTiposEntrada(
      evento.tiposEntrada?.length
        ? evento.tiposEntrada.map((tipo, index) => ({
            id: `repeat-${Date.now()}-${index}`,
            nombre: tipo.nombre || '',
            precio: String(tipo.precio ?? ''),
            cupo: String(tipo.cupo ?? ''),
          }))
        : [{ id: String(Date.now()), nombre: '', precio: '', cupo: '' }]
    );
    setErrores({});
    setResultadoPublicacion(null);
    navigation.setParams({ duplicateEvento: undefined });
  }, [navigation, route?.params?.duplicateEvento]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      if (isPublishing || isPickingImages) return;
      reiniciarFormulario();
      setResultadoPublicacion(null);
      navigation.setParams({ duplicateEvento: undefined });
    });

    return unsubscribe;
  }, [isPickingImages, isPublishing, navigation]);

  if (currentUser?.rol !== 'organizador') {
    return (
      <AccessDeniedView
        headerTitle="Crear Evento"
        headerSubtitle="Acceso Restringido"
        actionText="Volver al Inicio"
        onBack={() => navigation.navigate('MainTabs')}
        navigation={navigation}
      />
    );
  }

  const cambiarCampo = (setter, key, value) => {
    setter(value);
    setErrores((prev) => {
      if (!prev[key]) return prev;
      const nuevosErrores = { ...prev };
      delete nuevosErrores[key];
      return nuevosErrores;
    });
  };

  const ejecutarScroll = (posY) => {
    if (typeof posY !== 'number') return;
    const targetY = Math.max(0, posY - 20);
    activeTargetY.current = targetY;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({
        y: targetY,
        animated: true,
      });
    });
  };

  const handleFocusField = (campo) => {
    if (Platform.OS === 'web') return;
    const sec1 = sectionOffsets.current.section1 || 0;
    const fld = fieldOffsets.current[campo] || 0;
    ejecutarScroll(sec1 + fld);
  };

  const handleFocusTipo = (tipoId) => {
    if (Platform.OS === 'web') return;
    const sec2 = sectionOffsets.current.section2 || 0;
    const cardY = tipoOffsets.current[tipoId] || 0;
    ejecutarScroll(sec2 + cardY);
  };

  const handleAddTipo = () => {
    const nuevoId = String(Date.now());
    setTiposEntrada((prev) => [
      ...prev,
      { id: nuevoId, nombre: '', precio: '', cupo: '' },
    ]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const handleRemoveTipo = (id) => {
    if (tiposEntrada.length <= 1) {
      notify({
        title: 'No se puede quitar la entrada',
        message: 'El evento debe contar al menos con un tipo de entrada.',
        type: 'warning',
      });
      return;
    }
    delete tipoOffsets.current[id];
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
          notify({
            title: 'La foto no se pudo agregar',
            message: 'Se aceptan imágenes JPEG, PNG o WebP de hasta 5 MB.',
            type: 'warning',
          });
        }
        if (validAssets.length) {
          setImagenes([validAssets[0]]);
          setImagenExistente('');
        }
      }
    } catch (error) {
      notify({
        title: 'No se pudieron seleccionar las fotos',
        message: error.message,
        type: 'error',
      });
    } finally {
      setIsPickingImages(false);
    }
  };

  const handleQuitarImagen = (uri) => {
    setImagenes((previous) => previous.filter((imagen) => imagen.uri !== uri));
    if (imagenExistente === uri) setImagenExistente('');
  };

  const reiniciarFormulario = () => {
    activeTargetY.current = null;
    setNombre('');
    setCategoria('');
    setFechaEvento(null);
    setUbicacion('');
    setDireccion('');
    setDescripcion('');
    setImagenes([]);
    setImagenExistente('');
    setTiposEntrada([{ id: String(Date.now()), nombre: '', precio: '', cupo: '' }]);
    setErrores({});
    setModoDuplicar(false);
  };

  const cerrarResultado = () => setResultadoPublicacion(null);

  const verEventoCreado = () => {
    const eventoId = resultadoPublicacion?.eventoId;
    cerrarResultado();
    if (eventoId) navigation.navigate('EventosTab', { editEventoId: eventoId });
  };

  const handlePublicar = async () => {
    Keyboard.dismiss();
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
      imagen: imagenExistente,
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
    <KeyboardAvoidingView
      style={commonStyles.screenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header title="AI Ticket It" subtitle="Crear Evento" />

      <ScrollView
        ref={scrollViewRef}
        style={commonStyles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom:
              keyboardHeight > 0
                ? Platform.OS === 'android'
                  ? keyboardHeight + 80
                  : 100
                : 40,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerTitleBox}>
          <Text style={styles.pageTitle}>
            {modoDuplicar ? 'Duplicar evento' : 'Publicar Nuevo Evento'}
          </Text>
          {modoDuplicar ? (
            <Text style={styles.pageSubtitle}>
              Se creará un evento independiente. Elegí una nueva fecha y revisá los precios y cupos antes de publicar.
            </Text>
          ) : null}
          {/*<Text style={styles.pageSubtitle}>
            Configura los detalles, cupos y categorías comerciales para tu audiencia.
          </Text>*/}
        </View>

        {/* Section 1: Main Info */}
        <View
          style={styles.cardSection}
          onLayout={(e) => {
            sectionOffsets.current.section1 = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.cardSectionHeader}>
            <Text style={styles.cardSectionTitle}>1. Información Principal</Text>
          </View>

          <View
            style={styles.inputGroup}
            onLayout={(e) => {
              fieldOffsets.current.nombre = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.inputLabel}>Nombre del Evento</Text>
            <TextInput
              style={[styles.textInput, errores.nombre && commonStyles.inputError]}
              value={nombre}
              onChangeText={(value) => cambiarCampo(setNombre, 'nombre', value)}
              placeholder="Ej. Recital Acústico 2026"
              placeholderTextColor={COLORS.textMuted}
              onFocus={() => handleFocusField('nombre')}
              accessibilityLabel="Nombre del evento"
            />
            {errores.nombre ? (
              <Text style={commonStyles.errorLabel} accessibilityLiveRegion="polite">
                {errores.nombre}
              </Text>
            ) : null}
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
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={[styles.catChipText, isSelected && styles.catChipTextSelected]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {errores.categoria ? (
              <Text style={commonStyles.errorLabel} accessibilityLiveRegion="polite">
                {errores.categoria}
              </Text>
            ) : null}
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

          <View
            style={styles.inputGroup}
            onLayout={(e) => {
              fieldOffsets.current.ubicacion = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.inputLabel}>Lugar / Predio</Text>
            <TextInput
              style={[styles.textInput, errores.ubicacion && commonStyles.inputError]}
              value={ubicacion}
              onChangeText={(value) => cambiarCampo(setUbicacion, 'ubicacion', value)}
              placeholder="Ej. Estadio Central"
              placeholderTextColor={COLORS.textMuted}
              onFocus={() => handleFocusField('ubicacion')}
              accessibilityLabel="Lugar o predio del evento"
            />
            {errores.ubicacion ? (
              <Text style={commonStyles.errorLabel} accessibilityLiveRegion="polite">
                {errores.ubicacion}
              </Text>
            ) : null}
          </View>

          <View
            style={styles.inputGroup}
            onLayout={(e) => {
              fieldOffsets.current.direccion = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.inputLabel}>Dirección</Text>
            <TextInput
              style={[styles.textInput, errores.direccion && commonStyles.inputError]}
              value={direccion}
              onChangeText={(value) => cambiarCampo(setDireccion, 'direccion', value)}
              placeholder="Ej. Av. Corrientes 1234, CABA"
              placeholderTextColor={COLORS.textMuted}
              onFocus={() => handleFocusField('direccion')}
              accessibilityLabel="Dirección del evento"
            />
            {errores.direccion ? (
              <Text style={commonStyles.errorLabel} accessibilityLiveRegion="polite">
                {errores.direccion}
              </Text>
            ) : null}
          </View>

          <View
            style={styles.inputGroup}
            onLayout={(e) => {
              fieldOffsets.current.descripcion = e.nativeEvent.layout.y;
            }}
          >
            <Text style={styles.inputLabel}>Descripción del Evento</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, errores.descripcion && commonStyles.inputError]}
              value={descripcion}
              onChangeText={(value) => cambiarCampo(setDescripcion, 'descripcion', value)}
              placeholder="Describí los artistas, propuesta y normas..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
              onFocus={() => handleFocusField('descripcion')}
              accessibilityLabel="Descripción del evento"
            />
            {errores.descripcion ? (
              <Text style={commonStyles.errorLabel} accessibilityLiveRegion="polite">
                {errores.descripcion}
              </Text>
            ) : null}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.imagePickerHeader}>
              <View>
                <Text style={styles.inputLabel}>Foto del evento</Text>
                <Text style={styles.imagePickerHint}>Una foto JPEG, PNG o WebP (hasta 5 MB)</Text>
              </View>
            </View>
            {imagenes.length > 0 || imagenExistente ? (
              <View style={styles.selectedImages}>
                {imagenes.length > 0 ? imagenes.map((imagen) => (
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
                )) : (
                  <View key={imagenExistente} style={styles.selectedImageItem}>
                    <Image source={{ uri: imagenExistente }} style={styles.selectedImagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleQuitarImagen(imagenExistente)}
                      disabled={isPublishing}
                      accessibilityRole="button"
                      accessibilityLabel="Quitar foto copiada del evento"
                    >
                      <Ionicons name="close" size={14} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                  </View>
                )}
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
                  Seleccioná una imagen desde la galería de tu celular.
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Section 2: Ticket Types & Quotas (TP Explicit Requirement) */}
        <View
          style={styles.cardSection}
          onLayout={(e) => {
            sectionOffsets.current.section2 = e.nativeEvent.layout.y;
          }}
        >
          <View style={styles.cardSectionHeader}>
            <Text style={styles.cardSectionTitle}>2. Tipos de Entrada y Cupos</Text>
            <TouchableOpacity
              style={styles.addTypeBtn}
              onPress={handleAddTipo}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={16} color={COLORS.tertiary} />
              <Text style={styles.addTypeBtnText}>Agregar Tipo</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSectionSubtitle}>
            Todos los campos son obligatorios
          </Text>

          {tiposEntrada.map((tipo, idx) => (
            <TipoEntradaFormCard
              key={tipo.id}
              tipo={tipo}
              index={idx}
              canRemove={tiposEntrada.length > 1}
              errores={errores}
              onLayout={(e) => {
                tipoOffsets.current[tipo.id] = e.nativeEvent.layout.y;
              }}
              onFocus={handleFocusTipo}
              onUpdate={handleUpdateTipo}
              onRemove={handleRemoveTipo}
            />
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.publishBtn, isPublishing && styles.publishBtnDisabled]}
          onPress={handlePublicar}
          disabled={isPublishing}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ disabled: isPublishing }}
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
      <PublicacionResultadoModal
        resultado={resultadoPublicacion}
        onClose={cerrarResultado}
        onViewEvent={verEventoCreado}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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
