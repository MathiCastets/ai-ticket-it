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

export default function CalificarScreen({ route, navigation }) {
  const { compraId } = route.params;
  const { compras, calificarEvento } = useApp();
  const isLoading = useMockLoading();

  const compra = compras.find((c) => c.id === compraId) || compras[0];

  const [puntuacion, setPuntuacion] = useState(5);
  const [comentario, setComentario] = useState('');

  const handleSubmit = () => {
    if (!comentario.trim()) {
      Alert.alert('Falta comentario', 'Por favor ingresá un breve comentario sobre tu experiencia.');
      return;
    }

    const res = calificarEvento({
      compraId: compra.id,
      puntuacion,
      comentario: comentario.trim(),
    });

    if (res.success) {
      Alert.alert('¡Gracias!', 'Tu reseña ha sido publicada y ayudará a futuros compradores.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.screenContainer}>
        <Header
          title="Calificar Evento"
          subtitle={compra.ordenCodigo}
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <LoadingSpinner variant="dots" label="Cargando los datos de tu compra..." />
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
          <Text style={styles.eventName}>{compra.eventoNombre}</Text>
          <Text style={styles.eventInfo}>
            {compra.tipoEntradaNombre} • Organizado por {compra.organizadorNombre}
          </Text>
          <View style={styles.badgeUsed}>
            <Ionicons name="checkmark-done" size={14} color={COLORS.secondary} />
            <Text style={styles.badgeUsedText}>ENTRADA UTILIZADA</Text>
          </View>
        </View>

        {/* Rating Score Selection */}
        <View style={styles.ratingCard}>
          <Text style={styles.sectionTitle}>Puntuación Numérica</Text>
          <Text style={styles.sectionSubtitle}>Seleccioná de 1 a 5 estrellas para calificar el show:</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setPuntuacion(star)}
                activeOpacity={0.7}
                style={styles.starTouch}
              >
                <Ionicons
                  name={star <= puntuacion ? 'star' : 'star-outline'}
                  size={36}
                  color={star <= puntuacion ? COLORS.statusWarning : COLORS.textMuted}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.scoreNumber}>{puntuacion}.0 / 5.0</Text>
        </View>

        {/* Written Review */}
        <View style={styles.commentCard}>
          <Text style={styles.sectionTitle}>Tu Comentario Escrito</Text>
          <Text style={styles.sectionSubtitle}>
            Contanos sobre el sonido, organización, puntualidad y accesos al lugar:
          </Text>

          <TextInput
            style={styles.textArea}
            placeholder="Escribí aquí tu reseña sobre el evento..."
            placeholderTextColor={COLORS.textMuted}
            value={comentario}
            onChangeText={setComentario}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.submitBtnText}>PUBLICAR RESEÑA</Text>
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
    gap: 12,
    marginVertical: 8,
  },
  starTouch: {
    padding: 4,
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
});
