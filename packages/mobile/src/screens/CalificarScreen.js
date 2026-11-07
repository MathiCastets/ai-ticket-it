import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import useMockLoading from '../hooks/useMockLoading';
import LoadingSpinner from '../components/loading/Spinners';
import AccessDeniedView from '../components/AccessDeniedView';

const MAX_REVIEW_LENGTH = 250;

export default function CalificarScreen({ route, navigation }) {
  const { compraId } = route.params;
  const { compras, currentUser, calificarEvento } = useApp();
  const isLoading = useMockLoading();

  const compra = compras.find((c) => c.id === compraId);
  const puedeCalificar = compra?.compradorId === currentUser?.id;

  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reseniaPublicada, setReseniaPublicada] = useState(false);

  if (currentUser?.rol !== 'comprador') {
    return (
      <AccessDeniedView
        headerTitle="Calificar Evento"
        headerSubtitle="Acceso Restringido"
        actionText="Volver"
        onBack={() => navigation.goBack()}
        navigation={navigation}
      />
    );
  }

  if (!compra || !puedeCalificar) {
    return (
      <AccessDeniedView
        headerTitle="Calificar Evento"
        headerSubtitle="Acceso Restringido"
        actionText="Volver a Mis Tickets"
        onBack={() => navigation.navigate('MainTabs')}
        navigation={navigation}
      />
    );
  }

  const handleSubmit = async () => {
    if (!puedeCalificar) {
      Alert.alert(
        'Acceso no disponible',
        'Esta compra no corresponde al perfil actual.'
      );
      return;
    }
    if (!comentario.trim()) {
      Alert.alert('Falta comentario', 'Por favor ingresá un breve comentario sobre tu experiencia.');
      return;
    }
    if (comentario.length > MAX_REVIEW_LENGTH) {
      Alert.alert('Reseña demasiado larga', 'La reseña no puede superar los 250 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await calificarEvento({
        compraId: compra.id,
        puntuacion,
        comentario: comentario.trim(),
      });
      if (!res.success) throw new Error(res.error || 'No se pudo publicar la reseña.');
      setReseniaPublicada(true);
    } catch (error) {
      Alert.alert('No se pudo publicar la reseña', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.screenContainer}>
        <Header
          title="Calificar Evento"
          subtitle={compra?.ordenCodigo || 'Acceso no disponible'}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner variant="dots" label="Cargando los datos de tu compra..." />
        </View>
      </View>
    );
  }

  if (!puedeCalificar) {
    return (
      <View style={styles.screenContainer}>
        <Header
          title="Calificar Evento"
          subtitle="Acceso no disponible"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.accessErrorContainer}>
          <Ionicons name="lock-closed-outline" size={38} color={COLORS.textMuted} />
          <Text style={styles.accessErrorTitle}>No podés calificar esta compra</Text>
          <Text style={styles.accessErrorText}>
            {!compra
              ? 'No encontramos el ticket solicitado.'
              : 'Esta compra no corresponde al perfil actual.'}
          </Text>
          <TouchableOpacity
            style={styles.accessBackButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.accessBackButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (reseniaPublicada || compra.reseniaRealizada) {
    return (
      <View style={styles.screenContainer}>
        <Header
          title="Calificar Evento"
          subtitle={compra.ordenCodigo}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={34} color={COLORS.statusSuccess} />
          </View>
          <Text style={styles.successTitle}>
            {reseniaPublicada ? '¡Reseña publicada!' : 'Ya calificaste este evento'}
          </Text>
          <Text style={styles.successText}>
            {reseniaPublicada
              ? 'Gracias por compartir tu experiencia. Tu opinión ayudará a otros compradores.'
              : 'Gracias por compartir tu experiencia con otros compradores.'}
          </Text>
          <TouchableOpacity
            style={styles.successButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.successButtonText}>Volver a Mis Tickets</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Header
        title="Calificar Evento"
        subtitle={compra.ordenCodigo}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.eventCard}>
          <Text style={styles.eventName}>{compra.eventoNombre || compra.evento?.nombre}</Text>
          <Text style={styles.eventInfo}>
            {compra.tipoEntradaNombre || compra.tipoEntrada?.nombre} • Organizado por {compra.organizadorNombre || (typeof compra.evento?.organizador === 'object' ? compra.evento.organizador.nombre : compra.evento?.organizador) || 'Organizador'}
          </Text>
          <View style={styles.badgeUsed}>
            <Ionicons name="checkmark-done" size={14} color={COLORS.secondary} />
            <Text style={styles.badgeUsedText}>ENTRADA UTILIZADA</Text>
          </View>
        </View>

        {/* Rating Score Selection */}
        <View style={styles.ratingCard}>
          <Text style={styles.sectionTitle}>Puntuación</Text>
          <Text style={styles.sectionSubtitle}>Seleccioná de 0.5 a 5 estrellas para calificar el show:</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <View key={star} style={styles.starTouch}>
                <View style={styles.starIconContainer} pointerEvents="none">
                  <Ionicons name="star-outline" size={36} color={COLORS.textMuted} />
                  {puntuacion >= star ? (
                    <Ionicons
                      name="star"
                      size={36}
                      color={COLORS.statusWarning}
                      style={styles.filledStar}
                    />
                  ) : puntuacion === star - 0.5 ? (
                    <View style={styles.halfStarOverlay}>
                      <Ionicons name="star" size={36} color={COLORS.statusWarning} />
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.starHalfTouch}
                  onPress={() => setPuntuacion(star - 0.5)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Puntuar ${star - 0.5} ${star - 0.5 === 1 ? 'estrella' : 'estrellas'}`}
                  accessibilityState={{ selected: puntuacion === star - 0.5 }}
                />
                <TouchableOpacity
                  style={[styles.starHalfTouch, styles.starRightHalfTouch]}
                  onPress={() => setPuntuacion(star)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Puntuar ${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
                  accessibilityState={{ selected: puntuacion === star }}
                />
              </View>
            ))}
          </View>

          <Text style={styles.scoreNumber}>{puntuacion.toFixed(1)} / 5.0</Text>
        </View>

        {/* Written Review */}
        <View style={styles.commentCard}>
          <Text style={[styles.sectionTitle, styles.commentTitle]}>Contanos que te pareció</Text>
          <Text style={styles.sectionSubtitle}>
            Contanos sobre el sonido, organización, puntualidad y accesos al lugar:
          </Text>

          <TextInput
            style={styles.textArea}
            placeholder="Escribí aquí tu reseña sobre el evento..."
            placeholderTextColor={COLORS.textMuted}
            value={comentario}
            onChangeText={setComentario}
            maxLength={MAX_REVIEW_LENGTH}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{comentario.length}/{MAX_REVIEW_LENGTH}</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, isSubmitting && styles.disabledBtn]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size={18} style={styles.buttonSpinner} />
              <Text style={styles.submitBtnText}>PUBLICANDO...</Text>
            </>
          ) : (
            <Text style={styles.submitBtnText}>PUBLICAR RESEÑA</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  accessErrorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  accessErrorTitle: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  accessErrorText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  accessBackButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 22,
    backgroundColor: COLORS.accentElectric,
  },
  accessBackButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    backgroundColor: 'rgba(0, 245, 160, 0.15)',
    marginBottom: 16,
  },
  successTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  successText: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },
  successButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: COLORS.accentElectric,
  },
  successButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  eventCard: {
    backgroundColor: COLORS.surfaceCard,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  eventName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  commentTitle: {
    textAlign: 'center',
  },
  eventInfo: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 10,
  },
  badgeUsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(222, 183, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeUsedText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.secondary,
    letterSpacing: 0.5,
  },
  ratingCard: {
    backgroundColor: COLORS.surfaceCard,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  starTouch: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  starIconContainer: {
    width: 36,
    height: 36,
    position: 'relative',
  },
  filledStar: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  halfStarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '50%',
    height: 36,
    overflow: 'hidden',
  },
  starHalfTouch: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '50%',
  },
  starRightHalfTouch: {
    left: '50%',
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.statusWarning,
    marginTop: 4,
  },
  commentCard: {
    backgroundColor: COLORS.surfaceCard,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textArea: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 13,
    minHeight: 120,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  characterCount: {
    alignSelf: 'flex-end',
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 5,
  },
  submitBtn: {
    backgroundColor: COLORS.accentElectric,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
  disabledBtn: {
    opacity: 0.65,
  },
  buttonSpinner: {
    width: 18,
    padding: 0,
  },
});
