import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/loading/Spinners';
import AccessDeniedView from '../components/AccessDeniedView';
import { useNotification } from '../components/NotificationProvider';

export default function DetalleEventoScreen({ route, navigation }) {
  const { eventoId } = route.params;
  const {
    eventos,
    favoritos,
    favoritosError,
    toggleFavorito,
    comprarEntrada,
    obtenerReseniasOrganizador,
    currentUser,
  } = useApp();
  const { notify } = useNotification();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 12;
  const [heroWidth, setHeroWidth] = useState(0);
  const effectiveHeroWidth = heroWidth || (Platform.OS === 'web' ? Math.min(screenWidth, 480) : screenWidth);

  const evento = eventos.find((e) => e.id === eventoId) || eventos[0];
  const organizadorId =
    evento?.organizadorId || evento?.organizadorObj?.id || evento?.organizador?.id;
  const imagenesEvento =
    evento?.multimedia?.length > 0 ? evento.multimedia : evento?.imagen ? [evento.imagen] : [];

  // Selection states
  const [selectedTipoId, setSelectedTipoId] = useState(
    evento?.tiposEntrada?.length > 0 ? evento.tiposEntrada[0].id : null
  );
  const [cantidad, setCantidad] = useState(1);
  const [compraExitosa, setCompraExitosa] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [reseniasOrganizador, setReseniasOrganizador] = useState([]);
  const [reseniasTotal, setReseniasTotal] = useState(0);
  const [puntuacionPromedio, setPuntuacionPromedio] = useState(null);
  const [paginaResenias, setPaginaResenias] = useState(1);
  const [totalPaginasResenias, setTotalPaginasResenias] = useState(0);
  const [isLoadingResenias, setIsLoadingResenias] = useState(true);
  const [isLoadingMoreResenias, setIsLoadingMoreResenias] = useState(false);
  const [errorResenias, setErrorResenias] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoadingResenias(true);
    setErrorResenias('');
    setReseniasOrganizador([]);

    if (!organizadorId) {
      setErrorResenias('No pudimos identificar al organizador de este evento.');
      setIsLoadingResenias(false);
      return () => {
        active = false;
      };
    }
    if (!evento) {
      return (
        <View style={styles.screenContainer}>
          <Header
            title="AI Ticket It"
            subtitle="Detalle Evento"
            showBack
            onBack={() => navigation.goBack()}
          />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' }}>
              No encontramos el evento
            </Text>
            <Text style={{ color: COLORS.textSecondary, marginTop: 8, textAlign: 'center' }}>
              Volvé a explorar y seleccioná otro evento.
            </Text>
          </View>
        </View>
      );
    }

    obtenerReseniasOrganizador(organizadorId, { page: 1, limit: 5 })
      .then((resultado) => {
        if (!active) return;
        setReseniasOrganizador(resultado.resenias);
        setReseniasTotal(resultado.total);
        setPuntuacionPromedio(resultado.promedio);
        setPaginaResenias(resultado.page);
        setTotalPaginasResenias(resultado.totalPages);
      })
      .catch((error) => {
        if (active) setErrorResenias(error.message || 'No se pudieron cargar las reseñas.');
      })
      .finally(() => {
        if (active) setIsLoadingResenias(false);
      });

    return () => {
      active = false;
    };
  }, [organizadorId, obtenerReseniasOrganizador]);


  if (currentUser?.rol === 'organizador') {
    return (
      <AccessDeniedView
        headerTitle="Detalle de Evento"
        headerSubtitle="Acceso Restringido"
        actionText="Ir a Mis Eventos"
        onBack={() => navigation.navigate('MainTabs')}
        navigation={navigation}
      />
    );
  }
  const selectedTipo = evento.tiposEntrada?.find((t) => t.id === selectedTipoId);
  const total = selectedTipo ? selectedTipo.precio * cantidad : 0;
  const handleToggleFavorito = () => toggleFavorito(evento.id).catch(() => {});

  const handleIncrement = () => {
    if (!selectedTipo) return;
    if (cantidad < selectedTipo.disponibles) {
      setCantidad((prev) => prev + 1);
    } else {
      notify({
        title: 'Límite alcanzado',
        message: `Solo quedan ${selectedTipo.disponibles} entradas disponibles para este tipo.`,
        type: 'warning',
      });
    }
  };

  const handleDecrement = () => {
    if (cantidad > 1) {
      setCantidad((prev) => prev - 1);
    }
  };

  const handleComprar = async () => {
    if (!selectedTipo) return;
    setIsBuying(true);
    try {
      const res = await comprarEntrada({
        eventoId: evento.id,
        tipoEntradaId: selectedTipo.id,
        cantidad,
      });
      if (!res.success) throw new Error(res.error || 'No se pudo completar la compra.');
      setCompraExitosa(true);
    } catch (error) {
      notify({ title: 'Error en la compra', message: error.message, type: 'error' });
    } finally {
      setIsBuying(false);
    }
  };

  const handleLoadMoreReviews = async () => {
    if (isLoadingMoreResenias || paginaResenias >= totalPaginasResenias) return;
    const paginaSiguiente = paginaResenias + 1;
    setIsLoadingMoreResenias(true);
    setErrorResenias('');
    try {
      const resultado = await obtenerReseniasOrganizador(organizadorId, {
        page: paginaSiguiente,
        limit: 5,
      });
      setReseniasOrganizador((actuales) => [...actuales, ...resultado.resenias]);
      setPaginaResenias(resultado.page);
      setReseniasTotal(resultado.total);
      setPuntuacionPromedio(resultado.promedio);
      setTotalPaginasResenias(resultado.totalPages);
    } catch (error) {
      setErrorResenias(error.message || 'No se pudieron cargar más reseñas.');
    } finally {
      setIsLoadingMoreResenias(false);
    }
  };

  const handleRetryReviews = async () => {
    setIsLoadingResenias(true);
    setErrorResenias('');
    try {
      const resultado = await obtenerReseniasOrganizador(organizadorId, {
        page: 1,
        limit: 5,
      });
      setReseniasOrganizador(resultado.resenias);
      setReseniasTotal(resultado.total);
      setPuntuacionPromedio(resultado.promedio);
      setPaginaResenias(resultado.page);
      setTotalPaginasResenias(resultado.totalPages);
    } catch (error) {
      setErrorResenias(error.message || 'No se pudieron cargar las reseñas.');
    } finally {
      setIsLoadingResenias(false);
    }
  };

  const catNombre = typeof evento?.categoria === 'object' && evento?.categoria !== null ? evento.categoria.nombre : (evento?.categoria || '');
  const orgNombre = typeof evento?.organizador === 'object' && evento?.organizador !== null ? evento.organizador.nombre : (evento?.organizador || '');

  return (
    <View style={styles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Detalle Evento" showBack onBack={() => navigation.goBack()} />

      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 + bottomInset }]} showsVerticalScrollIndicator={false}>
        {favoritosError ? (
          <Text style={{ color: COLORS.textMuted, marginBottom: 12 }}>
            No se pudieron sincronizar los favoritos: {favoritosError}
          </Text>
        ) : null}
        {/* Hero Image */}
        <View
          style={styles.heroContainer}
          onLayout={(e) => {
            const w = e.nativeEvent.layout?.width;
            if (w && w !== heroWidth) {
              setHeroWidth(w);
            }
          }}
        >
          {imagenesEvento.length > 1 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.heroGallery}
            >
              {imagenesEvento.map((imagen, index) => (
                <Image
                  key={`${imagen}-${index}`}
                  source={{ uri: imagen }}
                  style={[styles.heroGalleryImage, { width: effectiveHeroWidth }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <Image
              source={imagenesEvento[0] ? { uri: imagenesEvento[0] } : null}
              style={styles.heroImage}
              resizeMode="cover"
            />
          )}
          <LinearGradient
            colors={['rgba(15, 8, 29, 0.62)', 'rgba(15, 8, 29, 0)', 'rgba(15, 8, 29, 0.65)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          <View style={styles.heroTopActions}>
            <View style={styles.heroBadges}>
              <View style={styles.liveBadge}>
                <View style={styles.pingDot} />
                <Text style={styles.liveBadgeText}>DISPONIBLE</Text>
              </View>
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{catNombre.toUpperCase()}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionRoundBtn}
              onPress={handleToggleFavorito}
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
          <Text style={styles.eventTitle}>{evento.nombre}</Text>

          {/* Date & Location Cards */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconBox}>
              <Ionicons name="calendar" size={18} color={COLORS.accentElectric} />
            </View>
            <View style={styles.infoTextBox}>
              <Text style={styles.infoPrimaryText}>{evento.fechaTexto}</Text>
              {/*<Text style={styles.infoSecondaryText}>Apertura de puertas: {evento.apertura || '18:00 hs'}</Text>*/}
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
                <Text style={styles.organizerName}>{orgNombre}</Text>
              </View>
              <View style={styles.ratingRow}>
                {isLoadingResenias ? (
                  <Text style={styles.ratingCount}>Cargando opiniones...</Text>
                ) : reseniasTotal > 0 ? (
                  <>
                    {puntuacionPromedio !== null ? (
                      <>
                        <Ionicons name="star" size={13} color={COLORS.statusWarning} />
                        <Text style={styles.ratingNumber}>{puntuacionPromedio.toFixed(1)}</Text>
                        <Text style={styles.ratingCount}>•</Text>
                      </>
                    ) : null}
                    <Text style={styles.ratingCount}>
                      {reseniasTotal}{' '}
                      {reseniasTotal === 1 ? 'opinión' : 'opiniones'}
                    </Text>
                  </>
                ) : !errorResenias ? (
                  <Text style={styles.ratingCount}>0 opiniones</Text>
                ) : null}
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
                <View
                  key={tipo.id}
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
                      onPress={() => {
                        setSelectedTipoId(tipo.id);
                        setCantidad(1);
                      }}
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
                          onPress={handleDecrement}
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
                          onPress={handleIncrement}
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
            })}
          </View>

          {/* Previous Reviews from Organizer (TP requirement) */}
          <View style={styles.reviewsSection}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.subHeading}>Reseñas de este Organizador</Text>
              {/*<Text style={styles.reviewsNote}>Experiencias previas</Text> */}
            </View>

            {isLoadingResenias && reseniasOrganizador.length === 0 ? (
              <Text style={styles.noReviewsText}>Cargando reseñas...</Text>
            ) : errorResenias && reseniasOrganizador.length === 0 ? (
              <View>
                <Text style={styles.noReviewsText}>{errorResenias}</Text>
                <TouchableOpacity
                  style={styles.reviewsAction}
                  onPress={handleRetryReviews}
                  disabled={isLoadingResenias}
                  accessibilityRole="button"
                >
                  <Text style={styles.reviewsActionText}>
                    {isLoadingResenias ? 'Reintentando...' : 'Reintentar'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : reseniasOrganizador.length > 0 ? (
              <>
                {reseniasOrganizador.map((res) => (
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
                {errorResenias ? (
                  <Text style={styles.noReviewsText}>{errorResenias}</Text>
                ) : null}
                {paginaResenias < totalPaginasResenias ? (
                  <TouchableOpacity
                    style={styles.reviewsAction}
                    onPress={handleLoadMoreReviews}
                    disabled={isLoadingMoreResenias}
                    accessibilityRole="button"
                  >
                    <Text style={styles.reviewsActionText}>
                      {isLoadingMoreResenias
                        ? 'Cargando...'
                        : `Cargar más reseñas (${reseniasTotal - reseniasOrganizador.length} restantes)`}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
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
          style={[styles.confirmBuyBtn, (!selectedTipo || selectedTipo.disponibles === 0 || isBuying) && styles.disabledBtn]}
          onPress={handleComprar}
          disabled={!selectedTipo || selectedTipo.disponibles === 0 || isBuying}
          activeOpacity={0.85}
        >
          {isBuying ? (
            <>
              <LoadingSpinner size={18} style={styles.buttonSpinner} />
              <Text style={styles.confirmBuyBtnText}>PROCESANDO...</Text>
            </>
          ) : (
            <>
              <Text style={styles.confirmBuyBtnText}>COMPRAR AHORA</Text>
              <Feather name="arrow-right" size={18} color={COLORS.textPrimary} />
            </>
          )}
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
                navigation.navigate('MainTabs', { screen: 'TicketsTab' });
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
    backgroundColor: COLORS.surfaceContainerLow,
    overflow: 'hidden',
  },
  heroGallery: {
    width: '100%',
    height: '100%',
  },
  heroGalleryImage: {
    height: '100%',
  },
  heroImage: {
    width: '100%',
    height: '100%',
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
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
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
  categoryChip: {
    backgroundColor: 'rgba(255, 0, 127, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  categoryChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
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
  buttonSpinner: {
    width: 18,
    padding: 0,
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
