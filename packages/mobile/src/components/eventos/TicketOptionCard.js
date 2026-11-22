import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export default function TicketOptionCard({
  tipo,
  isSelected,
  cantidad,
  isBuying,
  onSelect,
  onIncrement,
  onDecrement,
}) {
  const hasCupo = tipo.disponibles > 0;

  return (
    <View
      style={[
        styles.ticketOptionCard,
        isSelected && styles.ticketOptionSelected,
        !hasCupo && styles.ticketOptionDisabled,
      ]}
    >
      <View style={styles.ticketOptionHeader}>
        <TouchableOpacity
          style={styles.ticketTitleRow}
          disabled={isBuying || !hasCupo}
          onPress={onSelect}
          activeOpacity={0.8}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected, disabled: !hasCupo || isBuying }}
          accessibilityLabel={`${tipo.nombre}, $${tipo.precio.toLocaleString('es-AR')}`}
        >
          <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
            {isSelected && <View style={styles.radioInnerDot} />}
          </View>
          <Text style={styles.ticketName}>{tipo.nombre}</Text>
        </TouchableOpacity>
        <Text style={styles.ticketPrice}>${tipo.precio.toLocaleString('es-AR')}</Text>
      </View>

      <Text style={styles.ticketDescription}>{tipo.descripcion}</Text>

      <View style={styles.ticketFooter}>
        <View style={styles.cupoBadge}>
          <Ionicons
            name={hasCupo ? 'checkmark-circle' : 'close-circle'}
            size={12}
            color={hasCupo ? COLORS.statusSuccess : COLORS.statusDanger}
          />
          <Text
            style={[
              styles.cupoText,
              { color: hasCupo ? COLORS.statusSuccess : COLORS.statusDanger },
            ]}
          >
            {hasCupo ? `${tipo.disponibles} cupos disponibles de ${tipo.cupo}` : 'Agotado'}
          </Text>
        </View>
        {isSelected && hasCupo ? (
          <View style={styles.counterRow}>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={onDecrement}
              disabled={isBuying || cantidad <= 1}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Restar una entrada de ${tipo.nombre}`}
            >
              <Feather name="minus" size={14} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{cantidad}</Text>
            <TouchableOpacity
              style={styles.counterBtn}
              onPress={onIncrement}
              disabled={isBuying}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Agregar una entrada de ${tipo.nombre}`}
            >
              <Feather name="plus" size={14} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ticketOptionCard: {
    backgroundColor: COLORS.surfaceCard,
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  ticketOptionSelected: {
    borderColor: COLORS.accentElectric,
    backgroundColor: COLORS.surfaceCardSubtle,
  },
  ticketOptionDisabled: {
    opacity: 0.5,
  },
  ticketOptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ticketTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minHeight: 40,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: COLORS.accentElectric,
  },
  radioInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accentElectric,
  },
  ticketName: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ticketPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.tertiary,
  },
  ticketDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginLeft: 26,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginLeft: 26,
  },
  cupoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  cupoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  counterBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceCardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    minWidth: 20,
    textAlign: 'center',
  },
});
