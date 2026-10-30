import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import useMockLoading from '../hooks/useMockLoading';
import { EventDetailSkeleton } from '../components/loading/Skeletons';

export default function DetalleEventoScreen({ route, navigation }) {
  const { eventoId } = route.params;
  const { eventos, favoritos, toggleFavorito, comprarEntrada } = useApp();
  const isLoading = useMockLoading();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 12;

  const evento = eventos.find((e) => e.id === eventoId) || eventos[0];

  // Selection states
  const [selectedTipoId, setSelectedTipoId] = useState(
    evento.tiposEntrada && evento.tiposEntrada.length > 0 ? evento.tiposEntrada[0].id : null
  );
  const [cantidad, setCantidad] = useState(1);
  const [compraExitosa, setCompraExitosa] = useState(false);

  const selectedTipo = evento.tiposEntrada?.find((t) => t.id === selectedTipoId);
  const total = selectedTipo ? selectedTipo.precio * cantidad : 0;

  const handleIncrement = () => {
    if (!selectedTipo) return;
    if (cantidad < selectedTipo.disponibles) {
      setCantidad((prev) => prev + 1);
    } else {
      Alert.alert('Límite alcanzado', `Solo quedan ${selectedTipo.disponibles} entradas disponibles para este tipo.`);
    }
  };

  const handleDecrement = () => {
    if (cantidad > 1) {
      setCantidad((prev) => prev - 1);
    }
  };

  const handleComprar = () => {
    if (!selectedTipo) return;
    const res = comprarEntrada({
      eventoId: evento.id,
      tipoEntradaId: selectedTipo.id,
      cantidad,
    });

    if (res.success) {
      setCompraExitosa(true);
    } else {
      Alert.alert('Error en la compra', res.error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.screenContainer}>
        <Header title="AI Ticket It" subtitle="Detalle Evento" showBack onBack={() => navigation.goBack()} />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <EventDetailSkeleton />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Detalle Evento" showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + bottomInset }]} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: evento.imagen }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />

          <View style={styles.heroTopActions}>
            <View style={styles.liveBadge}>
              <View style={styles.pingDot} />
              <Text style={styles.liveBadgeText}>DISPONIBLE</Text>
            </View>

            <TouchableOpacity
              style={styles.actionRoundBtn}
              onPress={() => toggleFavorito(evento.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={favoritos.includes(evento.id) ? 'heart' : 'heart-outline'}
                size={20}
                color={favoritos.includes(evento.id) ? COLORS.accentElectric : COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Title & Badges */}
        <View style={styles.contentSection}>
          <View style={styles.categoryBadgeRow}>
            <View style={styles.categoryChip}>
              <Text style={styles.categoryChipText}>{evento.categoria.toUpperCase()}</Text>
            </View>
            <View style={styles.demandChip}>
              <Ionicons name="flame" size={12} color={COLORS.badgeCyanGlow} />
              <Text style={styles.demandChipText}>Alta demanda</Text>
            </View>
          </View>

          <Text style={styles.eventTitle}>{evento.nombre}</Text>

          {/* Date & Location Cards */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconBox}>
              <Ionicons name="calendar" size={18} color={COLORS.accentElectric} />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={styles.infoPrimaryText}>{evento.fechaTexto}</Text>
              <Text style={styles.infoSecondaryText}>Apertura de puertas: {evento.apertura || '18:00 hs'}</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoIconBox, { backgroundColor: 'rgba(32, 217, 249, 0.15)' }]}>
              <Ionicons name="location" size={18} color={COLORS.tertiary} />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={styles.infoPrimaryText}>{evento.ubicacion}</Text>
              <Text style={styles.infoSecondaryText}>{evento.direccion}</Text>
            </View>
          </View>

          {/* Organizer Section */}
          <View style={styles.organizerCard}>
            <View style={styles.organizerAvatarBox}>
              <Ionicons name="business" size={20} color={COLORS.badgeCyanGlow} />
            </View>
            <View style={styles.organizerTextBox}>
              <View style={styles.organizerNameRow}>
                <Text style={styles.organizerName}>{evento.organizador}</Text>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.statusSuccess} />
              </View>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color={COLORS.statusWarning} />
                <Text style={styles.ratingNumber}>{evento.organizadorRating}</Text>
                <Text style={styles.ratingCount}>• {evento.totalResenias || 120} opiniones verificadas</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionBox}>
            <Text style={styles.subHeading}>Sobre el Espectáculo</Text>
            <Text style={styles.descriptionText}>{evento.descripcion}</Text>
          </View>

          {/* Ticket Selection (Tipos de Entrada) */}
          <View style={styles.ticketSection}>
            <Text style={styles.subHeading}>Seleccioná tu Entrada</Text>
            <Text style={styles.sectionSubtitle}>Elegí la ubicación y cantidad deseada (sujeto a cupo):</Text>

            {evento.tiposEntrada?.map((tipo) => {
              const isSelected = selectedTipoId === tipo.id;
              const hasCupo = tipo.disponibles > 0;
              return (
                <TouchableOpacity
                  key={tipo.id}
                  style={[
                    styles.ticketOptionCard,
                    isSelected && styles.ticketOptionSelected,
                    !hasCupo && styles.ticketOptionDisabled,
                  ]}
                  onPress={() => {
                    if (hasCupo) {
                      setSelectedTipoId(tipo.id);
                      setCantidad(1);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.ticketOptionHeader}>
                    <View style={styles.ticketTitleRow}>
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioInnerDot} />}
                      </View>
                      <Text style={styles.ticketName}>{tipo.nombre}</Text>
                    </View>
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
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quantity Selector */}
          {selectedTipo && selectedTipo.disponibles > 0 && (
            <View style={styles.quantitySection}>
              <Text style={styles.quantityLabel}>Cantidad de entradas:</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity style={styles.counterBtn} onPress={handleDecrement} activeOpacity={0.7}>
                  <Feather name="minus" size={16} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{cantidad}</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={handleIncrement} activeOpacity={0.7}>
                  <Feather name="plus" size={16} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Previous Reviews from Organizer (TP requirement) */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.subHeading}>Reseñas de este Organizador</Text>
              <Text style={styles.reviewsNote}>Experiencias previas</Text>
            </View>

            {evento.reseniasAnteriores && evento.reseniasAnteriores.length > 0 ? (
              evento.reseniasAnteriores.map((res) => (
                <View key={res.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewUser}>{res.comprador}</Text>
                    <View style={styles.reviewStars}>
                      <Ionicons name="star" size={12} color={COLORS.statusWarning} />
                      <Text style={styles.reviewScore}>{res.puntuacion}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{res.detalle}</Text>
                  <Text style={styles.reviewDate}>{res.fecha}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noReviewsText}>Aún no hay reseñas registradas para este organizador.</Text>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Sticky Buy Bar */}
      <View style={[styles.bottomBar, { height: 68 + bottomInset, paddingBottom: bottomInset }]}>
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>TOTAL A PAGAR</Text>
          <Text style={styles.totalPrice}>${total.toLocaleString('es-AR')}</Text>
        </View>

        <TouchableOpacity
          style={[styles.confirmBuyBtn, (!selectedTipo || selectedTipo.disponibles === 0) && styles.disabledBtn]}
          onPress={handleComprar}
          disabled={!selectedTipo || selectedTipo.disponibles === 0}
          activeOpacity={0.85}
        >
          <Text style={styles.confirmBuyBtnText}>COMPRAR AHORA</Text>
          <Feather name="arrow-right" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      {compraExitosa && (
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark-done" size={32} color={COLORS.statusSuccess} />
            </View>
            <Text style={styles.modalTitle}>¡Compra Confirmada!</Text>
            <Text style={styles.modalSubtitle}>
              Tu entrada para <Text style={{ color: COLORS.textPrimary, fontWeight: '700' }}>{evento.nombre}</Text> fue registrada con éxito.
            </Text>

            <View style={styles.modalDetailsBox}>
              <Text style={styles.modalDetailRow}>Entrada: {selectedTipo?.nombre} (x{cantidad})</Text>
              <Text style={styles.modalDetailRow}>Total: ${total.toLocaleString('es-AR')}</Text>
              <Text style={[styles.modalDetailRow, { color: COLORS.statusSuccess }]}>Estado: CONFIRMADA</Text>
            </View>

            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => {
                setCompraExitosa(false);
                navigation.navigate('TicketsTab');
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.modalActionText}>VER MIS TICKETS</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    paddingBottom: 110,
  },
  heroContainer: {
    position: 'relative',
    width: '100%',
    height: 220,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 8, 29, 0.45)',
  },
  heroTopActions: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 8, 29, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.badgeCyanGlow,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.badgeCyanGlow,
    letterSpacing: 0.5,
  },
  actionRoundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 8, 29, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSection: {
    padding: 16,
  },
  categoryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    backgroundColor: COLORS.secondaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  demandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.surfaceCardSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  demandChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.badgeCyanGlow,
  },
  eventTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 0, 127, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextBox: {
    flex: 1,
  },
  infoPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  infoSecondaryText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  organizerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    padding: 12,
    borderRadius: 12,
    gap: 12,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  organizerAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surfaceCardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerTextBox: {
    flex: 1,
  },
  organizerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  organizerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingNumber: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  ratingCount: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  descriptionBox: {
    marginBottom: 20,
  },
  subHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  ticketSection: {
    marginBottom: 16,
  },
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
    marginLeft: 26,
  },
  cupoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cupoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceCard,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
  reviewsSection: {
    marginTop: 8,
  },
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewsNote: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.tertiary,
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  totalContainer: {
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.5,
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.badgeCyanGlow,
  },
  confirmBuyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accentElectric,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
  },
  disabledBtn: {
    opacity: 0.4,
  },
  confirmBuyBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 8, 29, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successModalCard: {
    width: '100%',
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  successIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 245, 160, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalDetailsBox: {
    width: '100%',
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 4,
  },
  modalDetailRow: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalActionBtn: {
    width: '100%',
    backgroundColor: COLORS.accentElectric,
    paddingVertical: 13,
    borderRadius: 20,
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
});
