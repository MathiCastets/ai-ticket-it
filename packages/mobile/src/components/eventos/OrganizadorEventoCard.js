import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';

export default function OrganizadorEventoCard({
  evento,
  estado,
  onEdit,
  onViewSales,
  onDuplicate,
}) {
  const esTerminado = estado === 'terminados';
  const edicionDeshabilitada = esTerminado || Boolean(evento.cerrado);

  return (
    <View style={[styles.eventCard, esTerminado && styles.endedEventCard]}>
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
            <View style={[styles.statusBadge, esTerminado && styles.endedStatusBadge]}>
              <Text style={[styles.statusBadgeText, esTerminado && styles.endedStatusBadgeText]}>
                {esTerminado ? 'TERMINADO' : 'ACTIVO'}
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
          style={[
            styles.secondaryButton,
            edicionDeshabilitada && styles.disabledSecondaryButton,
          ]}
          onPress={() => onEdit(evento)}
          disabled={edicionDeshabilitada}
          activeOpacity={edicionDeshabilitada ? 1 : 0.7}
          accessibilityRole="button"
          accessibilityLabel={
            edicionDeshabilitada
              ? `Evento finalizado, no se puede editar ${evento.nombre}`
              : `Editar ${evento.nombre}`
          }
          accessibilityState={{ disabled: edicionDeshabilitada }}
        >
          <Feather
            name="edit-2"
            size={15}
            color={edicionDeshabilitada ? COLORS.textMuted : COLORS.tertiary}
          />
          <Text
            style={[
              styles.secondaryButtonText,
              edicionDeshabilitada && styles.disabledSecondaryButtonText,
            ]}
          >
            Editar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => onViewSales(evento)}
          accessibilityRole="button"
          accessibilityLabel={`Ver ventas de ${evento.nombre}`}
        >
          <Ionicons name="stats-chart-outline" size={15} color={COLORS.textPrimary} />
          <Text style={styles.primaryButtonText}>Ventas</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.repeatButton}
        onPress={() => onDuplicate(evento)}
        accessibilityRole="button"
        accessibilityLabel={`Duplicar ${evento.nombre}`}
      >
        <Feather name="copy" size={14} color={COLORS.tertiary} />
        <Text style={styles.repeatButtonText}>Duplicar evento</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceContainerLow,
  },
  eventInfo: { padding: 14, gap: 5 },
  eventLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  eventCategory: {
    color: COLORS.tertiary,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
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
  disabledSecondaryButton: {
    opacity: 0.45,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  secondaryButtonText: { color: COLORS.tertiary, fontSize: 12, fontWeight: '700' },
  disabledSecondaryButtonText: { color: COLORS.textMuted },
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
});
