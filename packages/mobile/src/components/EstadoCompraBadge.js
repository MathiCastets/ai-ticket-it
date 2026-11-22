import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme/colors';

export const getEstadoCompraColor = (estado) => {
  switch (estado) {
    case 'CONFIRMADA':
      return COLORS.statusSuccess;
    case 'UTILIZADA':
      return COLORS.secondary;
    case 'PENDIENTE':
      return COLORS.statusWarning;
    default:
      return COLORS.statusDanger;
  }
};

export default function EstadoCompraBadge({ estado, variant = 'filled' }) {
  const statusColor = getEstadoCompraColor(estado);

  if (variant === 'outlined') {
    return (
      <View style={[styles.outlinedChip, { borderColor: statusColor }]}>
        <Text style={[styles.outlinedText, { color: statusColor }]}>{estado}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.filledChip, { backgroundColor: 'rgba(15, 8, 29, 0.85)' }]}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <Text style={[styles.filledText, { color: statusColor }]}>{estado}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  filledChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filledText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  outlinedChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  outlinedText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
