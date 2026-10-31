import React, { useMemo, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import LoadingSpinner from '../components/loading/Spinners';

export default function EscanearScreen() {
  const { compras, currentUser, marcarEntradaUtilizada } = useApp();
  const [codigo, setCodigo] = useState('');
  const [compraEncontrada, setCompraEncontrada] = useState(null);
  const [error, setError] = useState('');
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const comprasDelOrganizador = useMemo(
    () => compras.filter((compra) => compra.organizadorId === currentUser.id),
    [compras, currentUser.id]
  );

  const buscarEntrada = () => {
    Keyboard.dismiss();
    setError('');
    setMensaje('');
    setCompraEncontrada(null);
    const consulta = codigo.trim().toLowerCase();
    if (!consulta) {
      setError('Ingresá el código de orden o el ID de la compra.');
      return;
    }

    const compra = comprasDelOrganizador.find(
      (item) =>
        item.id?.toLowerCase() === consulta ||
        item.ordenCodigo?.toLowerCase() === consulta
    );
    if (!compra) {
      setError('No encontramos una entrada para tus eventos con ese código.');
      return;
    }
    if (compra.estado !== 'CONFIRMADA') {
      setError(
        compra.estado === 'UTILIZADA'
          ? 'Esta entrada ya fue utilizada.'
          : `La entrada no se puede acreditar porque está ${compra.estado.toLowerCase()}.`
      );
      return;
    }
    setCompraEncontrada(compra);
  };

  const acreditarEntrada = async () => {
    if (!compraEncontrada) return;
    setIsCheckingIn(true);
    setError('');
    setMensaje('');
    try {
      const resultado = await marcarEntradaUtilizada(compraEncontrada.id);
      if (!resultado.success) throw new Error(resultado.error || 'No se pudo acreditar la entrada.');
      setCompraEncontrada(resultado.compra);
      setMensaje('Entrada acreditada correctamente.');
      setCodigo('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsCheckingIn(false);
    }
  };

  return (
    <View style={styles.screen}>
      <Header title="AI Ticket It" subtitle="Acreditar Entradas" />
      <View style={styles.content}>
        <View style={styles.heading}>
          <View style={styles.iconCircle}>
            <Ionicons name="qr-code-outline" size={26} color={COLORS.tertiary} />
          </View>
          <Text style={styles.title}>Acreditar entrada</Text>
          <Text style={styles.subtitle}>Ingresá el código de orden que figura en el ticket.</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Código de orden o ID de compra</Text>
          <TextInput
            style={styles.input}
            value={codigo}
            onChangeText={(value) => {
              setCodigo(value);
              setError('');
              setMensaje('');
              setCompraEncontrada(null);
            }}
            placeholder="#TK-84920"
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={buscarEntrada}
            accessibilityLabel="Código de orden o ID de compra"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={buscarEntrada}
            accessibilityRole="button"
          >
            <Ionicons name="search" size={17} color={COLORS.textPrimary} />
            <Text style={styles.searchButtonText}>Buscar entrada</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color={COLORS.statusDanger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {compraEncontrada ? (
          <View style={styles.resultCard}>
            <View style={styles.resultHeading}>
              <Ionicons
                name={compraEncontrada.estado === 'UTILIZADA' ? 'checkmark-circle' : 'ticket'}
                size={20}
                color={compraEncontrada.estado === 'UTILIZADA' ? COLORS.statusSuccess : COLORS.tertiary}
              />
              <Text style={styles.resultTitle}>
                {compraEncontrada.estado === 'UTILIZADA' ? 'Entrada utilizada' : 'Entrada válida'}
              </Text>
            </View>
            <Text style={styles.eventName}>{compraEncontrada.eventoNombre}</Text>
            <Text style={styles.detail}>
              {compraEncontrada.cantidad} × {compraEncontrada.tipoEntradaNombre}
            </Text>
            <Text style={styles.detail}>Orden: {compraEncontrada.ordenCodigo}</Text>
            <Text style={styles.detail}>Comprador: {compraEncontrada.compradorNombre}</Text>
            {compraEncontrada.estado === 'CONFIRMADA' ? (
              <TouchableOpacity
                style={[styles.confirmButton, isCheckingIn && styles.disabled]}
                onPress={acreditarEntrada}
                disabled={isCheckingIn}
                accessibilityRole="button"
              >
                {isCheckingIn ? (
                  <LoadingSpinner size={18} />
                ) : (
                  <Text style={styles.confirmButtonText}>Marcar como utilizada</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {mensaje ? (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.statusSuccess} />
            <Text style={styles.successText}>{mensaje}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 18, gap: 14 },
  heading: { alignItems: 'center', gap: 7, paddingVertical: 12 },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceCard,
    marginBottom: 4,
  },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800' },
  subtitle: { maxWidth: 380, color: COLORS.textMuted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  formCard: {
    padding: 15,
    gap: 10,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '700' },
  input: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceContainerLow,
    color: COLORS.textPrimary,
    fontSize: 15,
  },
  searchButton: {
    minHeight: 44,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.accentElectric,
  },
  searchButtonText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '700' },
  resultCard: {
    padding: 16,
    gap: 8,
    borderRadius: 15,
    backgroundColor: COLORS.surfaceCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resultHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultTitle: { color: COLORS.textPrimary, fontWeight: '800', fontSize: 14 },
  eventName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 4 },
  detail: { color: COLORS.textMuted, fontSize: 12 },
  confirmButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.statusSuccess,
    marginTop: 6,
  },
  confirmButtonText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,70,90,0.1)',
  },
  errorText: { flex: 1, color: COLORS.statusDanger, fontSize: 12 },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(58,220,140,0.1)',
  },
  successText: { color: COLORS.statusSuccess, fontSize: 12, fontWeight: '700' },
});
