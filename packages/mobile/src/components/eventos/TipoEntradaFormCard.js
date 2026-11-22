import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { commonStyles } from '../../theme/commonStyles';

export default function TipoEntradaFormCard({
  tipo,
  index,
  canRemove,
  errores = {},
  onLayout,
  onFocus,
  onUpdate,
  onRemove,
}) {
  const nombreError = errores[`tipo-${tipo.id}-nombre`];
  const precioError = errores[`tipo-${tipo.id}-precio`];
  const cupoError = errores[`tipo-${tipo.id}-cupo`];

  return (
    <View style={styles.tipoRowCard} onLayout={onLayout}>
      <View style={styles.tipoHeader}>
        <Text style={styles.tipoNumber}>Entrada #{index + 1}</Text>
        {canRemove && (
          <TouchableOpacity
            onPress={() => onRemove(tipo.id)}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar tipo de entrada ${index + 1}`}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.statusDanger} />
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={[styles.tipoInput, nombreError && commonStyles.inputError]}
        value={tipo.nombre}
        onChangeText={(val) => onUpdate(tipo.id, 'nombre', val)}
        placeholder="Nombre (ej. Platea VIP, General)"
        placeholderTextColor={COLORS.textMuted}
        onFocus={() => onFocus(tipo.id)}
        accessibilityLabel={`Nombre del tipo de entrada ${index + 1}`}
      />
      {nombreError ? (
        <Text style={commonStyles.errorLabel} accessibilityLiveRegion="polite">
          {nombreError}
        </Text>
      ) : null}

      <View style={styles.tipoInlineRow}>
        <View style={styles.tipoHalfInputBox}>
          <Text style={styles.subInputLabel}>Precio ($ ARS):</Text>
          <TextInput
            style={[styles.tipoInput, precioError && commonStyles.inputError]}
            value={tipo.precio}
            onChangeText={(val) => onUpdate(tipo.id, 'precio', val)}
            placeholder="8000"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            onFocus={() => onFocus(tipo.id)}
            accessibilityLabel={`Precio en pesos argentinos de entrada ${index + 1}`}
          />
          {precioError ? (
            <Text style={commonStyles.errorLabel} accessibilityLiveRegion="polite">
              {precioError}
            </Text>
          ) : null}
        </View>

        <View style={styles.tipoHalfInputBox}>
          <Text style={styles.subInputLabel}>Cupo Máximo:</Text>
          <TextInput
            style={[styles.tipoInput, cupoError && commonStyles.inputError]}
            value={tipo.cupo}
            onChangeText={(val) => onUpdate(tipo.id, 'cupo', val)}
            placeholder="150"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
            onFocus={() => onFocus(tipo.id)}
            accessibilityLabel={`Cupo máximo de entrada ${index + 1}`}
          />
          {cupoError ? (
            <Text style={commonStyles.errorLabel} accessibilityLiveRegion="polite">
              {cupoError}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
