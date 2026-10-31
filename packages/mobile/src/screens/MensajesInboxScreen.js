import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import Header from '../components/Header';
import useMockLoading from '../hooks/useMockLoading';
import { ConversationListSkeleton } from '../components/loading/Skeletons';

export default function MensajesInboxScreen({ navigation }) {
  const { compras, currentUser } = useApp();
  const isLoading = useMockLoading();
  const conversaciones = compras.filter(
    (compra) =>
      compra.compradorId === currentUser.id || compra.organizadorId === currentUser.id
  );

  return (
    <View style={styles.screenContainer}>
      <Header title="AI Ticket It" subtitle="Bandeja de Mensajes" />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerInfo}>
          <Text style={styles.pageTitle}>Conversaciones Activas</Text>
          <Text style={styles.pageSubtitle}>
            {currentUser.rol === 'organizador'
              ? 'Consultas directas de compradores sobre sus compras'
              : 'Chats abiertos con los organizadores de tus eventos'}
          </Text>
        </View>

        <View style={styles.inboxList}>
          {isLoading ? <ConversationListSkeleton /> : conversaciones.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={34} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Todavía no hay conversaciones</Text>
              <Text style={styles.emptySubtitle}>
                Las conversaciones aparecerán acá cuando compres una entrada o alguien consulte por uno de tus eventos.
              </Text>
            </View>
          ) : conversaciones.map((compra) => {
            const lastMsg =
              compra.mensajes && compra.mensajes.length > 0
                ? compra.mensajes[compra.mensajes.length - 1]
                : null;

            return (
              <TouchableOpacity
                key={compra.id}
                style={styles.chatCard}
                onPress={() => navigation.navigate('Chat', { compraId: compra.id })}
                activeOpacity={0.8}
              >
                <View style={styles.avatarBox}>
                  <Ionicons
                    name={currentUser.rol === 'organizador' ? 'person' : 'business'}
                    size={20}
                    color={COLORS.badgeCyanGlow}
                  />
                </View>

                <View style={styles.chatCardContent}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.chatTitle}>
                      {currentUser.rol === 'organizador'
                        ? (compra.compradorNombre || (typeof compra.comprador === 'object' ? `${compra.comprador.nombre || ''} ${compra.comprador.apellido || ''}`.trim() : compra.comprador) || 'Comprador')
                        : (compra.organizadorNombre || (typeof compra.evento?.organizador === 'object' ? compra.evento.organizador.nombre : compra.evento?.organizador) || 'Organizador')}
                    </Text>
                    <Text style={styles.chatTime}>{lastMsg?.fechaHora || 'Hoy'}</Text>
                  </View>

                  <Text style={styles.eventRef}>
                    {compra.eventoNombre || compra.evento?.nombre} • {compra.ordenCodigo}
                  </Text>

                  <Text style={styles.lastMessageText} numberOfLines={1}>
                    {lastMsg ? lastMsg.texto : 'Toca para iniciar una consulta en esta compra...'}
                  </Text>
                </View>

                {compra.mensajes?.length > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadCount}>{compra.mensajes.length}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
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
    paddingBottom: 30,
    gap: 16,
  },
  headerInfo: {
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  inboxList: {
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 44,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    color: COLORS.textMuted,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    padding: 14,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceCardSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  chatTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  eventRef: {
    fontSize: 11,
    color: COLORS.tertiary,
    marginTop: 1,
  },
  lastMessageText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  unreadBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.accentElectric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCount: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
});
