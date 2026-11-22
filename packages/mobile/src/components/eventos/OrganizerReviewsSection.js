import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme/colors';
import { commonStyles } from '../../theme/commonStyles';

export default function OrganizerReviewsSection({
  resenias,
  total,
  paginaActual,
  totalPaginas,
  isLoading,
  isLoadingMore,
  error,
  onRetry,
  onLoadMore,
}) {
  return (
    <View style={styles.reviewsSection}>
      <View style={styles.reviewsHeader}>
        <Text style={commonStyles.subHeading}>Reseñas de este Organizador</Text>
      </View>

      {isLoading && resenias.length === 0 ? (
        <Text style={styles.noReviewsText}>Cargando reseñas...</Text>
      ) : error && resenias.length === 0 ? (
        <View>
          <Text style={styles.noReviewsText} accessibilityLiveRegion="polite">
            {error}
          </Text>
          <TouchableOpacity
            style={styles.reviewsAction}
            onPress={onRetry}
            disabled={isLoading}
            accessibilityRole="button"
          >
            <Text style={styles.reviewsActionText}>
              {isLoading ? 'Reintentando...' : 'Reintentar'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : resenias.length > 0 ? (
        <>
          {resenias.map((res) => (
            <View key={res.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUser}>
                  {typeof res.comprador === 'object' && res.comprador !== null
                    ? `${res.comprador.nombre || ''} ${res.comprador.apellido || ''}`.trim()
                    : (res.comprador || 'Comprador')}
                </Text>
                <View style={styles.reviewStars}>
                  <Ionicons name="star" size={12} color={COLORS.statusWarning} />
                  <Text style={styles.reviewScore}>{res.puntuacion}</Text>
                </View>
              </View>
              {res.eventoNombre ? (
                <Text style={styles.reviewEvent}>{res.eventoNombre}</Text>
              ) : null}
              <Text style={styles.reviewComment}>{res.detalle}</Text>
              <Text style={styles.reviewDate}>{res.fecha}</Text>
            </View>
          ))}
          {error ? (
            <Text style={styles.noReviewsText} accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
          {paginaActual < totalPaginas ? (
            <TouchableOpacity
              style={styles.reviewsAction}
              onPress={onLoadMore}
              disabled={isLoadingMore}
              accessibilityRole="button"
            >
              <Text style={styles.reviewsActionText}>
                {isLoadingMore
                  ? 'Cargando...'
                  : `Cargar más reseñas (${total - resenias.length} restantes)`}
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : (
        <Text style={styles.noReviewsText}>Aún no hay reseñas registradas para este organizador.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  reviewsSection: {
    marginTop: 8,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewCard: {
    backgroundColor: COLORS.surfaceCard,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewUser: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  reviewEvent: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.tertiary,
    marginBottom: 4,
  },
  reviewStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewScore: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.statusWarning,
  },
  reviewComment: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  reviewDate: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  noReviewsText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  reviewsAction: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 210, 242, 0.14)',
  },
  reviewsActionText: {
    color: COLORS.badgeCyanGlow,
    fontSize: 12,
    fontWeight: '700',
  },
});
