import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../theme/colors';

export default function EventCard({
  item,
  isFavorito,
  resumenOrganizador,
  minPrice,
  categoriaNombre,
  organizadorNombre,
  onPress,
  onToggleFavorito,
}) {
  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityHint="Abre el detalle del evento"
    >
      <View style={styles.eventImageContainer}>
        <Image source={item.imagen ? { uri: item.imagen } : null} style={styles.eventImage} />
        <LinearGradient
          colors={['rgba(15, 8, 29, 0.62)', 'rgba(15, 8, 29, 0)']}
          style={styles.imageTopScrim}
          pointerEvents="none"
        />
        <View style={styles.eventCategoryTag}>
          <Text style={styles.eventCategoryText}>{categoriaNombre}</Text>
        </View>
        <TouchableOpacity
          style={styles.eventFavoriteButton}
          onPress={onToggleFavorito}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorito
              ? `Quitar ${item.nombre} de favoritos`
              : `Agregar ${item.nombre} a favoritos`
          }
          accessibilityState={{ selected: isFavorito }}
        >
          <Ionicons
            name={isFavorito ? 'heart' : 'heart-outline'}
            size={18}
            color={isFavorito ? COLORS.accentElectric : COLORS.textPrimary}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.eventDetails}>
        <Text style={styles.eventTitle} numberOfLines={1}>
          {item.nombre}
        </Text>
        <View style={styles.eventInfoRow}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.eventInfoText} numberOfLines={1}>
            {item.fechaTexto}
          </Text>
        </View>
        <View style={styles.eventInfoRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.eventInfoText} numberOfLines={1}>
            {item.ubicacion}
          </Text>
        </View>
        <View style={styles.eventFooter}>
          <View style={styles.eventOrganizer}>
            <Ionicons name="business-outline" size={13} color={COLORS.tertiary} />
            <Text style={styles.eventOrganizerName} numberOfLines={1}>
              {organizadorNombre}
            </Text>
            <Text style={styles.eventOrganizerSeparator}>•</Text>
            {resumenOrganizador?.totalResenias > 0 &&
            Number.isFinite(resumenOrganizador.rating) ? (
              <>
                <Ionicons name="star" size={12} color={COLORS.statusWarning} />
                <Text style={styles.eventRating}>
                  {resumenOrganizador.rating.toFixed(1)}
                </Text>
              </>
            ) : (
              <Text style={styles.eventNewLabel}>Nuevo</Text>
            )}
          </View>
          <View style={styles.eventPriceBadge}>
            <Text style={styles.eventPrice}>
              Desde{' '}
              <Text style={styles.eventPriceAmount}>
                ${(minPrice ?? 0).toLocaleString('es-AR')}
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  eventImageContainer: {
    position: 'relative',
    height: 190,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  imageTopScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 78,
  },
  eventCategoryTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 8, 29, 0.8)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },
  eventCategoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventFavoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 8, 29, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDetails: {
    padding: 14,
    gap: 8,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  eventInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eventInfoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  eventOrganizer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },
  eventRating: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flexShrink: 0,
  },
  eventOrganizerName: {
    minWidth: 0,
    flexShrink: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  eventOrganizerSeparator: {
    color: COLORS.textMuted,
    fontSize: 11,
    flexShrink: 0,
  },
  eventNewLabel: {
    color: COLORS.badgeCyanGlow,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 0,
  },
  eventPrice: {
    fontSize: 10,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  eventPriceAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.badgeCyanGlow,
  },
  eventPriceBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 210, 242, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 242, 0.2)',
  },
});
