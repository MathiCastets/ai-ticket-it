import React from 'react';
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
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import LoadingSpinner from '../loading/Spinners';
import DateTimeSelector from '../DateTimeSelector';

export default function EditarEventoModal({
  visible,
  formulario,
  setFormulario,
  isSaving,
  isPickingImage,
  onSelectImage,
  onClose,
  onSave,
}) {
  const ocupado = isSaving || isPickingImage;
  const tieneImagen = Boolean(formulario?.imagen && !formulario?.quitarImagen);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Editar evento</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={ocupado}
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
              {tieneImagen ? (
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
                  onPress={onSelectImage}
                  disabled={ocupado}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar foto de portada"
                >
                  {isPickingImage ? (
                    <LoadingSpinner size={16} />
                  ) : (
                    <>
                      <Feather name="upload" size={14} color={COLORS.tertiary} />
                      <Text style={styles.coverButtonText}>
                        {tieneImagen ? 'Cambiar foto' : 'Elegir foto'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {tieneImagen ? (
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
                    disabled={ocupado}
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
                disabled={ocupado}
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
                accessibilityLabel="Nombre del evento"
              />
              <Text style={styles.fieldLabel}>Ubicación</Text>
              <TextInput
                style={styles.input}
                value={formulario.ubicacion}
                onChangeText={(ubicacion) => setFormulario((prev) => ({ ...prev, ubicacion }))}
                maxLength={160}
                accessibilityLabel="Ubicación del evento"
              />
              <Text style={styles.fieldLabel}>Descripción</Text>
              <TextInput
                style={[styles.input, styles.descriptionInput]}
                value={formulario.descripcion}
                onChangeText={(descripcion) => setFormulario((prev) => ({ ...prev, descripcion }))}
                multiline
                maxLength={1000}
                accessibilityLabel="Descripción del evento"
              />
              <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.disabled]}
                onPress={onSave}
                disabled={ocupado}
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
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(4,8,16,0.78)',
  },
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800' },
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
  primaryButtonText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.6 },
});
