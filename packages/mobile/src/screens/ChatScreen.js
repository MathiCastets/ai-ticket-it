import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { isConversationClosed, useConversationStatusTime } from '../conversationStatus';
import Header from '../components/Header';
import useMockLoading from '../hooks/useMockLoading';
import LoadingSpinner from '../components/loading/Spinners';

const obtenerFechaMensaje = (mensaje) => {
  if (!mensaje.enviado) return null;
  const fecha = new Date(mensaje.enviado);
  if (Number.isNaN(fecha.getTime())) return null;

  return {
    clave: `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`,
    etiqueta: fecha.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  };
};

const CHAT_INPUT_LINE_HEIGHT = 18;
const CHAT_INPUT_VERTICAL_PADDING = 8;
const CHAT_INPUT_MIN_HEIGHT = CHAT_INPUT_LINE_HEIGHT + CHAT_INPUT_VERTICAL_PADDING * 2;
const CHAT_INPUT_MAX_HEIGHT = CHAT_INPUT_LINE_HEIGHT * 4 + CHAT_INPUT_VERTICAL_PADDING * 2;

export default function ChatScreen({ route, navigation }) {
  const { compraId } = route.params;
  const { compras, enviarMensaje, marcarMensajesLeidos, currentUser } = useApp();
  const isLoading = useMockLoading();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : 10;
  const messagesScrollRef = useRef(null);
  const chatInputRef = useRef(null);

  const compra = compras.find(
    (item) =>
      item.id === compraId &&
      (item.compradorId === currentUser.id || item.organizadorId === currentUser.id)
  );
  const ahora = useConversationStatusTime(compra ? [compra] : []);
  const conversacionCerrada = isConversationClosed(compra, ahora);
  const mensajesConSeparadores = (compra?.mensajes || []).reduce((resultado, mensaje) => {
    const fecha = obtenerFechaMensaje(mensaje);
    if (fecha && fecha.clave !== resultado.ultimaFecha) {
      resultado.items.push({ tipo: 'separador', id: `fecha-${fecha.clave}`, etiqueta: fecha.etiqueta });
      resultado.ultimaFecha = fecha.clave;
    }
    resultado.items.push({ tipo: 'mensaje', mensaje });
    return resultado;
  }, { items: [], ultimaFecha: null }).items;
  const [nuevoTexto, setNuevoTexto] = useState('');
  const [chatInputHeight, setChatInputHeight] = useState(CHAT_INPUT_MIN_HEIGHT);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    marcarMensajesLeidos(compraId).catch((error) => {
      Alert.alert('No se pudieron marcar los mensajes como leídos', error.message);
    });
  }, [compraId, currentUser.id, marcarMensajesLeidos]);

  useEffect(() => {
    if (isLoading) return undefined;

    const frame = requestAnimationFrame(() => {
      messagesScrollRef.current?.scrollToEnd({ animated: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [compraId, isLoading]);

  const handleEnviar = async () => {
    if (!compra || conversacionCerrada || !nuevoTexto.trim()) return;
    setIsSending(true);
    try {
      await enviarMensaje(compra.id, nuevoTexto);
      setNuevoTexto('');
      setChatInputHeight(CHAT_INPUT_MIN_HEIGHT);
    } catch (error) {
      Alert.alert('No se pudo enviar el mensaje', error.message);
    } finally {
      setIsSending(false);
    }
  };

  if (!compra) {
    return (
      <View style={styles.screenContainer}>
        <Header
          title="Chat de Compra"
          subtitle="Acceso no disponible"
          showBack
          onBack={() => navigation.goBack()}
        />
        <View style={styles.emptyAccess}>
          <Ionicons name="lock-closed-outline" size={34} color={COLORS.textMuted} />
          <Text style={styles.emptyChatText}>Esta conversación no pertenece al perfil actual.</Text>
          <Text style={styles.emptyChatSub}>Proba a iniciar sesión con otra cuenta.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screenContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header
        title="Chat de Compra"
        subtitle={compra.ordenCodigo}
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* Context Banner */}
      <View style={styles.contextBanner}>
        <View style={styles.contextLeft}>
          <View style={styles.orgAvatar}>
            <Ionicons name="business" size={18} color={COLORS.badgeCyanGlow} />
          </View>
          <View style={styles.contextDetails}>
            <View style={styles.orgNameRow}>
              <Text style={styles.orgName} numberOfLines={1}>
                {compra.organizadorNombre || (typeof compra.evento?.organizador === 'object' ? compra.evento.organizador.nombre : compra.evento?.organizador) || 'Organizador'}
              </Text>
              <Ionicons name="checkmark-circle" size={13} color={COLORS.statusSuccess} />
            </View>
            <Text style={styles.contextSub} numberOfLines={1} ellipsizeMode="tail">
              {compra.eventoNombre || compra.evento?.nombre} ({compra.tipoEntradaNombre || compra.tipoEntrada?.nombre} x{compra.cantidad})
            </Text>
          </View>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{compra.estado}</Text>
        </View>
      </View>

      {/* Messages Stream */}
      <ScrollView
        ref={messagesScrollRef}
        style={styles.messagesScroll}
        contentContainerStyle={[
          styles.messagesContent,
          isLoading && styles.loadingMessagesContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.messagesLoading}>
            <LoadingSpinner variant="dots" label="Cargando mensajes..." />
          </View>
        ) : mensajesConSeparadores.length > 0 ? (
          mensajesConSeparadores.map((item) => {
            if (item.tipo === 'separador') {
              return (
                <View key={item.id} style={styles.dateSeparator}>
                  <View style={styles.dateLine} />
                  <Text style={styles.dateText}>{item.etiqueta}</Text>
                  <View style={styles.dateLine} />
                </View>
              );
            }

            const msg = item.mensaje;
            const isMe =
              msg.usuarioId === currentUser.id ||
              (!msg.usuarioId && msg.usuario === currentUser.nombreCompleto);

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageBubbleWrapper,
                  isMe ? styles.myMessageWrapper : styles.otherMessageWrapper,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    isMe ? styles.myMessageBubble : styles.otherMessageBubble,
                  ]}
                >
                  <Text style={styles.messageText}>{msg.texto}</Text>
                </View>

                <View style={styles.messageMeta}>
                  <Text style={styles.messageTime}>{msg.fechaHora}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyChatBox}>
            <Ionicons name="chatbubbles-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyChatText}>No hay mensajes en este chat.</Text>
            <Text style={styles.emptyChatSub}>
              Escribí tu consulta sobre accesos, horarios o dudas del evento.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Chat Input Bar */}
      {conversacionCerrada ? (
        <View
          style={[
            styles.closedConversationNotice,
            { paddingBottom: bottomInset, minHeight: 56 + bottomInset },
          ]}
        >
          <Ionicons name="lock-closed" size={16} color={COLORS.textMuted} />
          <Text style={styles.closedConversationText}>
            Esta conversación se encuentra cerrada
          </Text>
        </View>
      ) : (
        <View style={[styles.inputBar, { minHeight: 56 + bottomInset, paddingBottom: bottomInset }]}>
          <TextInput
            ref={chatInputRef}
            style={[
              styles.chatInput,
              Platform.OS === 'web' && { scrollbarWidth: 'none' },
              { height: chatInputHeight },
            ]}
            placeholder={`Escribe como ${currentUser.nombre}...`}
            placeholderTextColor={COLORS.textMuted}
            value={nuevoTexto}
            onChangeText={(texto) => {
              setNuevoTexto(texto);

              if (Platform.OS === 'web') {
                requestAnimationFrame(() => {
                  const input = chatInputRef.current;
                  if (!input) return;

                  input.style.height = 'auto';
                  const nextHeight = Math.min(
                    CHAT_INPUT_MAX_HEIGHT,
                    Math.max(CHAT_INPUT_MIN_HEIGHT, input.scrollHeight)
                  );
                  input.style.height = `${nextHeight}px`;
                  setChatInputHeight(nextHeight);
                });
              } else if (!texto) {
                setChatInputHeight(CHAT_INPUT_MIN_HEIGHT);
              }
            }}
            onContentSizeChange={({ nativeEvent }) => {
              if (Platform.OS === 'web') return;

              const nextHeight = Math.min(
                CHAT_INPUT_MAX_HEIGHT,
                Math.max(
                  CHAT_INPUT_MIN_HEIGHT,
                  Math.ceil(nativeEvent.contentSize.height)
                )
              );
              setChatInputHeight(nextHeight);
            }}
            onKeyPress={(event) => {
              if (Platform.OS === 'web' && event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleEnviar();
              }
            }}
            onSubmitEditing={handleEnviar}
            multiline
            submitBehavior="submit"
            rows={Platform.OS === 'web' ? 1 : undefined}
            editable={!isLoading && !isSending && !conversacionCerrada}
          />
          <TouchableOpacity
            style={[styles.sendButton, (isLoading || isSending || conversacionCerrada || !nuevoTexto.trim()) && styles.sendButtonDisabled]}
            onPress={handleEnviar}
            disabled={isLoading || isSending || conversacionCerrada || !nuevoTexto.trim()}
            activeOpacity={0.8}
          >
            {isSending ? (
              <LoadingSpinner size={16} style={styles.sendSpinner} />
            ) : (
              <Ionicons name="send" size={16} color={COLORS.textPrimary} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contextBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceCard,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  contextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  contextDetails: {
    flex: 1,
    minWidth: 0,
  },
  orgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orgNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  orgName: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  contextSub: {
    flexShrink: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  statusPill: {
    flexShrink: 0,
    marginLeft: 8,
    backgroundColor: COLORS.surfaceContainerLow,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.badgeCyanGlow,
  },
  messagesScroll: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  loadingMessagesContent: {
    flexGrow: 1,
  },
  messagesLoading: {
    flex: 1,
    minHeight: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendSpinner: {
    width: 16,
    padding: 0,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 14,
    gap: 10,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },
  messageBubbleWrapper: {
    marginBottom: 12,
    maxWidth: '82%',
    minWidth: 0,
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '100%',
    minWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primaryContainer,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.surfaceCard,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  messageText: {
    ...(Platform.OS === 'web' ? { overflowWrap: 'anywhere' } : {}),
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textPrimary,
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
    marginRight: 4,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.textMuted,
  },
  emptyChatBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyChatText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyChatSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    maxWidth: 220,
  },
  emptyAccess: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  closedConversationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  closedConversationText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.surfaceCard,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: CHAT_INPUT_VERTICAL_PADDING,
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: CHAT_INPUT_LINE_HEIGHT,
    textAlignVertical: 'center',
    maxHeight: CHAT_INPUT_MAX_HEIGHT,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentElectric,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
});
