import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CATEGORIAS, EVENTOS_INICIALES, COMPRAS_INICIALES, USUARIOS } from '../data/mockData';
import { resolverImagen, USE_MOCK_DATA } from '../config/apiConfig';
import { api } from '../services/api';
import { isConversationClosed } from '../conversationStatus';
import { COLORS } from '../theme/colors';

const AppContext = createContext();

const obtenerNombreUsuario = (usuario) => {
  if (!usuario) return '';
  if (typeof usuario === 'string') return usuario;
  return `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
};

const normalizarMensaje = (mensaje) => {
  const usuario = mensaje.usuario;
  const enviado = mensaje.enviado ? new Date(mensaje.enviado) : null;

  return {
    ...mensaje,
    usuarioId: mensaje.usuarioId || usuario?.id || '',
    emisor: mensaje.emisor || usuario?.rol || 'organizador',
    usuario: obtenerNombreUsuario(usuario) || mensaje.usuarioNombre || '',
    texto: mensaje.texto || mensaje.mensaje || '',
    leidoPor: Array.isArray(mensaje.leidoPor) ? mensaje.leidoPor : [],
    fechaHora:
      mensaje.fechaHora ||
      mensaje.fechaHoraFormateada ||
      (enviado && !Number.isNaN(enviado.getTime())
        ? enviado.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : ''),
  };
};

const normalizarResenia = (resenia) => ({
  ...resenia,
  comprador: obtenerNombreUsuario(resenia.comprador) || 'Comprador',
  detalle: resenia.detalle || resenia.comentario || '',
  fecha:
    resenia.fecha ||
    (resenia.fechaHora
      ? new Date(resenia.fechaHora).toLocaleDateString('es-AR')
      : 'Reciente'),
});

const normalizarEvento = (evento) => {
  const categoriaObj =
    typeof evento.categoria === 'object' && evento.categoria !== null
      ? evento.categoria
      : null;
  const organizadorObj =
    typeof evento.organizador === 'object' && evento.organizador !== null
      ? evento.organizador
      : null;

  return {
    ...evento,
    imagen: resolverImagen(evento.imagen || evento.multimedia?.[0]),
    multimedia: (evento.multimedia || []).map(resolverImagen),
    categoria: categoriaObj?.nombre || evento.categoria || evento.categoriaNombre || '',
    categoriaObj,
    organizador: organizadorObj?.nombre || evento.organizador || evento.organizadorNombre || '',
    organizadorObj,
    organizadorId: organizadorObj?.id || evento.organizadorId || '',
    organizadorRating: evento.organizadorRating ?? organizadorObj?.rating ?? 5,
    reseniasAnteriores: (evento.reseniasAnteriores || evento.resenias || []).map(normalizarResenia),
  };
};

const normalizarCompra = (compra) => ({
  ...compra,
  fechaHora: compra.fechaHora || null,
  eventoId: compra.eventoId || compra.evento?.id || '',
  eventoNombre: compra.eventoNombre || compra.evento?.nombre || '',
  eventoFecha: compra.eventoFecha || compra.evento?.fecha || '',
  eventoFechaTexto: compra.eventoFechaTexto || compra.evento?.fechaTexto || '',
  tipoEntradaId: compra.tipoEntradaId || compra.tipoEntrada?.id || '',
  tipoEntradaNombre: compra.tipoEntradaNombre || compra.tipoEntrada?.nombre || '',
  compradorId: compra.compradorId || compra.comprador?.id || '',
  compradorNombre:
    compra.compradorNombre || obtenerNombreUsuario(compra.comprador) || compra.comprador || '',
  organizadorId:
    compra.organizadorId ||
    compra.evento?.organizador?.id ||
    compra.evento?.organizadorId ||
    '',
  organizadorNombre:
    compra.organizadorNombre ||
    obtenerNombreUsuario(compra.evento?.organizador) ||
    compra.evento?.organizador ||
    '',
  imagen: resolverImagen(compra.imagen || compra.evento?.imagen),
  ubicacion: compra.ubicacion || compra.evento?.ubicacion || '',
  mensajes: (compra.mensajes || []).map((mensaje) =>
    normalizarMensaje({
      ...mensaje,
      usuarioId:
        mensaje.usuarioId ||
        (mensaje.emisor === 'comprador'
          ? compra.compradorId || compra.comprador?.id
          : mensaje.emisor === 'organizador'
            ? compra.organizadorId || compra.evento?.organizador?.id
            : ''),
    })
  ),
});

const normalizarUsuario = (usuario) => ({
  ...usuario,
  nombreCompleto: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim(),
  favoritos: Array.isArray(usuario.favoritos) ? usuario.favoritos : [],
});

export const AppProvider = ({ children }) => {
  const initialMockUser = USE_MOCK_DATA ? USUARIOS[0] : null;
  const [currentUserId, setCurrentUserId] = useState(initialMockUser?.id || null);
  const currentUserIdRef = useRef(initialMockUser?.id || null);
  const [usuarios, setUsuarios] = useState(USE_MOCK_DATA ? USUARIOS.map(normalizarUsuario) : []);
  const [categorias, setCategorias] = useState(
    USE_MOCK_DATA ? CATEGORIAS.filter((categoria) => categoria !== 'Todos') : []
  );
  const [eventos, setEventos] = useState(
    USE_MOCK_DATA ? EVENTOS_INICIALES.map(normalizarEvento) : []
  );
  const [compras, setCompras] = useState(
    USE_MOCK_DATA ? COMPRAS_INICIALES.map(normalizarCompra) : []
  );
  const initialUser = initialMockUser;
  const [favoritos, setFavoritos] = useState(initialUser?.favoritos || []);
  const [favoritosError, setFavoritosError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');
  const backendStatusRef = useRef('checking');
  const backendErrorRef = useRef(null);
  const initialSyncPromise = useRef(null);
  const favoritosRef = useRef(initialUser?.favoritos || []);
  const favoritosPorUsuarioRef = useRef(
    new Map((USE_MOCK_DATA ? USUARIOS : []).map((user) => [user.id, user.favoritos || []]))
  );
  const favoritosQueue = useRef(Promise.resolve());

  const actualizarEstadoBackend = (status, error = null) => {
    backendStatusRef.current = status;
    backendErrorRef.current = error;
    setBackendStatus(status);
  };

  const sincronizarConBackend = useCallback(async () => {
    if (USE_MOCK_DATA) {
      actualizarEstadoBackend('offline');
      return false;
    }

    actualizarEstadoBackend('checking');
    let health;
    try {
      health = await api.checkHealth();
    } catch (error) {
      const backendRespondio = Boolean(error.status) || error.name === 'AbortError';
      if (backendRespondio) {
        actualizarEstadoBackend('error', error);
        console.error('[AI Ticket It Mobile] Falló el health check del backend.', error);
        return false;
      }

      actualizarEstadoBackend('offline');
      console.info(
        '[AI Ticket It Mobile] Backend no disponible; no se usan datos locales.',
        error.message
      );
      return false;
    }

    if (health?.status !== 'ok') {
      const error = new Error('El backend respondió con un estado de salud inválido.');
      actualizarEstadoBackend('error', error);
      console.error('[AI Ticket It Mobile]', error.message);
      return false;
    }

    let usuariosApi;
    let categoriasApi;
    let eventosApi;
    let comprasApi;
    try {
      [usuariosApi, categoriasApi, eventosApi, comprasApi] = await Promise.all([
        api.getUsuarios(),
        api.getCategorias(),
        api.getEventos(),
        api.getCompras(),
      ]);
    } catch (error) {
      actualizarEstadoBackend('error', error);
      console.error('[AI Ticket It Mobile] No se pudieron sincronizar los datos iniciales.', error);
      return false;
    }

    if (
      !Array.isArray(usuariosApi) ||
      usuariosApi.length === 0 ||
      !Array.isArray(categoriasApi) ||
      !Array.isArray(eventosApi) ||
      !Array.isArray(comprasApi)
    ) {
      const error = new Error('El backend devolvió un formato de datos inesperado.');
      actualizarEstadoBackend('error', error);
      console.error('[AI Ticket It Mobile]', error.message);
      return false;
    }

    const usuariosNormalizados = usuariosApi.map(normalizarUsuario);
    const usuarioInicial = usuariosNormalizados.some((user) => user.id === currentUserIdRef.current)
      ? currentUserIdRef.current
      : usuariosNormalizados[0].id;
    currentUserIdRef.current = usuarioInicial;
    setCurrentUserId(usuarioInicial);
    setUsuarios(usuariosNormalizados);
    setCategorias(categoriasApi.map((categoria) => categoria.nombre));
    setEventos(eventosApi.map(normalizarEvento));
    setCompras(comprasApi.map(normalizarCompra));
    favoritosPorUsuarioRef.current = new Map(
      usuariosNormalizados.map((user) => [user.id, user.favoritos])
    );
    actualizarEstadoBackend('connected');
    console.info('[AI Ticket It Mobile] Conectado exitosamente con el backend Express');
    return true;
  }, []);

  useEffect(() => {
    initialSyncPromise.current = sincronizarConBackend();
  }, [sincronizarConBackend]);

  const backendDisponible = async () => {
    if (USE_MOCK_DATA) return false;
    if (backendStatusRef.current === 'checking' && initialSyncPromise.current) {
      await initialSyncPromise.current;
    }
    if (backendStatusRef.current === 'offline') {
      await sincronizarConBackend();
    }
    if (backendStatusRef.current === 'error') {
      throw new Error(
        backendErrorRef.current?.message ||
          'El backend respondió, pero no se pudo completar la sincronización.'
      );
    }
    if (backendStatusRef.current === 'offline') {
      throw new Error('No hay conexión con el backend. Iniciá el servidor e intentá nuevamente.');
    }
    if (backendStatusRef.current !== 'connected') {
      throw new Error('No hay datos del backend disponibles para completar la operación.');
    }
    return true;
  };

  const guardarEventoServidor = (eventoServidor) => {
    if (!eventoServidor?.id) return;
    const evento = normalizarEvento(eventoServidor);
    setEventos((prev) =>
      prev.some((item) => item.id === evento.id)
        ? prev.map((item) => (item.id === evento.id ? evento : item))
        : [evento, ...prev]
    );
  };

  const guardarCompraServidor = (compraServidor) => {
    if (!compraServidor?.id) {
      throw new Error('El backend no devolvió la compra actualizada.');
    }
    const compra = normalizarCompra(compraServidor);
    setCompras((prev) =>
      prev.some((item) => item.id === compra.id)
        ? prev.map((item) => (item.id === compra.id ? compra : item))
        : [compra, ...prev]
    );
    if (compraServidor.evento?.id) {
      guardarEventoServidor(compraServidor.evento);
    }
    return compra;
  };

  const currentUser = usuarios.find((user) => user.id === currentUserId) || usuarios[0] || null;
  const seleccionarUsuario = (usuarioId) => {
    if (usuarios.some((user) => user.id === usuarioId)) {
      currentUserIdRef.current = usuarioId;
      setCurrentUserId(usuarioId);
    }
  };

  useEffect(() => {
    let active = true;

    if (!currentUser) {
      return () => {
        active = false;
      };
    }

    const userFavorites =
      favoritosPorUsuarioRef.current.get(currentUser.id) || currentUser.favoritos || [];
    favoritosRef.current = userFavorites;
    setFavoritos(userFavorites);
    setFavoritosError('');

    if (backendStatus !== 'connected') {
      return () => {
        active = false;
      };
    }

    setFavoritosError('');
    const request = favoritosQueue.current.then(() => api.getFavoritos(currentUser.id));
    favoritosQueue.current = request.then(
      () => undefined,
      () => undefined
    );
    request
      .then((ids) => {
        if (!Array.isArray(ids)) {
          throw new Error('El backend devolvió un formato de favoritos inesperado.');
        }
        favoritosPorUsuarioRef.current.set(currentUser.id, ids);
        if (active) {
          favoritosRef.current = ids;
          setFavoritos(ids);
        }
      })
      .catch((error) => {
        if (active) {
          setFavoritosError(error.message);
          console.error('[AI Ticket It Mobile] No se pudieron cargar los favoritos.', error);
        }
      });

    return () => {
      active = false;
    };
  }, [backendStatus, currentUser]);

  const toggleFavorito = (eventoId) => {
    const usuarioId = currentUser.id;
    const operation = favoritosQueue.current.then(async () => {
      let updated;

      if (await backendDisponible()) {
        const userFavorites =
          favoritosPorUsuarioRef.current.get(usuarioId) ||
          usuarios.find((user) => user.id === usuarioId)?.favoritos ||
          [];
        const adding = !userFavorites.includes(eventoId);
        updated = adding
          ? await api.agregarFavorito(usuarioId, eventoId)
          : await api.removerFavorito(usuarioId, eventoId);
      } else {
        const userFavorites =
          favoritosPorUsuarioRef.current.get(usuarioId) ||
          usuarios.find((user) => user.id === usuarioId)?.favoritos ||
          [];
        const adding = !userFavorites.includes(eventoId);
        updated = adding
          ? [...userFavorites, eventoId]
          : userFavorites.filter((id) => id !== eventoId);
      }

      if (!Array.isArray(updated)) {
        throw new Error('El backend devolvió un formato de favoritos inesperado.');
      }
      favoritosPorUsuarioRef.current.set(usuarioId, updated);
      if (currentUserId === usuarioId) {
        favoritosRef.current = updated;
        setFavoritos(updated);
        setFavoritosError('');
      }
      return updated;
    });

    favoritosQueue.current = operation.then(
      () => undefined,
      () => undefined
    );
    return operation.catch((error) => {
      if (currentUserId === usuarioId) {
        setFavoritosError(error.message);
      }
      throw error;
    });
  };

  const getDiasRestantes = (fechaString) => {
    const fechaEvento = new Date(fechaString);
    if (Number.isNaN(fechaEvento.getTime())) return 0;
    const diffTime = fechaEvento.getTime() - Date.now();
    return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)), 0);
  };

  const comprarEntrada = async ({ eventoId, tipoEntradaId, cantidad }) => {
    if (currentUser.rol !== 'comprador') {
      return { success: false, error: 'Seleccioná un perfil comprador para realizar una compra.' };
    }
    if (await backendDisponible()) {
      const compraServidor = await api.crearCompra({
        compradorId: currentUser.id,
        eventoId,
        tipoEntradaId,
        cantidad,
      });
      return { success: true, compra: guardarCompraServidor(compraServidor) };
    }

    const evento = eventos.find((item) => item.id === eventoId);
    if (!evento) return { success: false, error: 'Evento no encontrado' };

    const tipo = evento.tiposEntrada.find((item) => item.id === tipoEntradaId);
    if (!tipo) return { success: false, error: 'Tipo de entrada no encontrado' };
    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
      return { success: false, error: 'La cantidad debe ser un número entero positivo.' };
    }
    if (tipo.disponibles < cantidad) {
      return { success: false, error: 'No hay cupo suficiente disponible' };
    }

    setEventos((prev) =>
      prev.map((item) =>
        item.id === eventoId
          ? {
              ...item,
              tiposEntrada: item.tiposEntrada.map((ticketType) =>
                ticketType.id === tipoEntradaId
                  ? { ...ticketType, disponibles: ticketType.disponibles - cantidad }
                  : ticketType
              ),
            }
          : item
      )
    );

    const nuevaCompra = normalizarCompra({
      id: `compra-${Date.now()}`,
      ordenCodigo: `#TK-${Math.floor(10000 + Math.random() * 90000)}`,
      eventoId: evento.id,
      eventoNombre: evento.nombre,
      eventoFecha: evento.fecha,
      eventoFechaTexto: evento.fechaTexto,
      tipoEntradaId: tipo.id,
      tipoEntradaNombre: tipo.nombre,
      cantidad,
      total: tipo.precio * cantidad,
      estado: 'CONFIRMADA',
      fechaHora: new Date().toISOString(),
      compradorId: currentUser.id,
      compradorNombre: `${currentUser.nombre} ${currentUser.apellido || ''}`.trim(),
      organizadorNombre: evento.organizador,
      organizadorId: evento.organizadorId,
      imagen: evento.imagen,
      ubicacion: evento.ubicacion,
      reseniaRealizada: false,
      mensajes: [],
    });

    setCompras((prev) => [nuevaCompra, ...prev]);
    return { success: true, compra: nuevaCompra };
  };

  const cancelarCompra = async (compraId) => {
    const compraActual = compras.find((item) => item.id === compraId);
    if (!compraActual || compraActual.compradorId !== currentUser.id) {
      return { success: false, error: 'Esta compra no pertenece al usuario seleccionado.' };
    }

    if (await backendDisponible()) {
      const compraServidor = await api.cancelarCompra(compraId, 'Comprador');
      return {
        success: true,
        mensaje: 'Compra cancelada y reembolsada con éxito',
        compra: guardarCompraServidor(compraServidor),
      };
    }

    const compra = compras.find((item) => item.id === compraId);
    if (!compra) return { success: false, error: 'Compra no encontrada' };
    if (compra.estado === 'UTILIZADA') {
      return { success: false, error: 'No se puede cancelar una entrada ya utilizada.' };
    }
    if (new Date(compra.eventoFecha).getTime() < Date.now()) {
      return { success: false, error: 'El evento ya se ha realizado.' };
    }

    setEventos((prev) =>
      prev.map((evento) =>
        evento.id === compra.eventoId
          ? {
              ...evento,
              tiposEntrada: evento.tiposEntrada.map((tipo) =>
                tipo.id === compra.tipoEntradaId
                  ? { ...tipo, disponibles: tipo.disponibles + compra.cantidad }
                  : tipo
              ),
            }
          : evento
      )
    );
    setCompras((prev) =>
      prev.map((item) =>
        item.id === compraId ? { ...item, estado: 'REEMBOLSADA' } : item
      )
    );
    return { success: true, mensaje: 'Compra cancelada y reembolsada con éxito' };
  };

  const enviarMensaje = async (compraId, texto) => {
    const compraActual = compras.find((item) => item.id === compraId);
    if (
      !compraActual ||
      (compraActual.compradorId !== currentUser.id &&
        compraActual.organizadorId !== currentUser.id)
    ) {
      throw new Error('Esta conversación no pertenece al usuario seleccionado.');
    }

    const textoLimpio = texto.trim();
    if (!textoLimpio) {
      throw new Error('El mensaje no puede estar vacío.');
    }
    if (isConversationClosed(compraActual)) {
      throw new Error('Esta conversación se encuentra cerrada.');
    }

    if (await backendDisponible()) {
      const mensajeServidor = await api.enviarMensaje(compraId, {
        usuarioId: currentUser.id,
        texto: textoLimpio,
      });
      const mensaje = normalizarMensaje(mensajeServidor);
      setCompras((prev) =>
        prev.map((compra) =>
          compra.id === compraId
            ? { ...compra, mensajes: [...(compra.mensajes || []), mensaje] }
            : compra
        )
      );
      return mensaje;
    }

    const nuevoMensaje = normalizarMensaje({
      id: `msg-${Date.now()}`,
      usuarioId: currentUser.id,
      emisor: currentUser.rol,
      usuario: currentUser.nombreCompleto || `${currentUser.nombre} ${currentUser.apellido || ''}`.trim(),
      texto: textoLimpio,
      enviado: new Date().toISOString(),
      fechaHora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    setCompras((prev) =>
      prev.map((compra) =>
        compra.id === compraId
          ? { ...compra, mensajes: [...(compra.mensajes || []), nuevoMensaje] }
          : compra
      )
    );
    return nuevoMensaje;
  };

  const marcarMensajesLeidos = async (compraId) => {
    const compraActual = compras.find((item) => item.id === compraId);
    if (
      !compraActual ||
      (compraActual.compradorId !== currentUser.id &&
        compraActual.organizadorId !== currentUser.id)
    ) {
      throw new Error('Esta conversación no pertenece al usuario seleccionado.');
    }

    const mensajesNoLeidos = (compraActual.mensajes || []).some(
      (mensaje) =>
        mensaje.usuarioId !== currentUser.id &&
        !mensaje.leidoPor?.includes(currentUser.id)
    );
    if (!mensajesNoLeidos) return;

    let mensajesActualizados;
    if (await backendDisponible()) {
      mensajesActualizados = await api.marcarMensajesLeidos(compraId, currentUser.id);
    } else {
      mensajesActualizados = compraActual.mensajes.map((mensaje) =>
        mensaje.usuarioId !== currentUser.id
          ? {
              ...mensaje,
              leidoPor: [...new Set([...(mensaje.leidoPor || []), currentUser.id])],
            }
          : mensaje
      );
    }

    setCompras((prev) =>
      prev.map((compra) =>
        compra.id === compraId
          ? { ...compra, mensajes: mensajesActualizados.map(normalizarMensaje) }
          : compra
      )
    );
  };

  const calificarEvento = async ({ compraId, puntuacion, comentario }) => {
    const compraActual = compras.find((item) => item.id === compraId);
    if (!compraActual || compraActual.compradorId !== currentUser.id) {
      return { success: false, error: 'Esta compra no pertenece al usuario seleccionado.' };
    }

    if (await backendDisponible()) {
      const compraServidor = await api.calificarCompra(compraId, { puntuacion, comentario });
      return { success: true, compra: guardarCompraServidor(compraServidor) };
    }

    const compra = compras.find((item) => item.id === compraId);
    if (!compra) return { success: false, error: 'Compra no encontrada' };
    if (compra.estado !== 'UTILIZADA') {
      return { success: false, error: 'Solo se puede calificar una entrada utilizada.' };
    }
    if (compra.reseniaRealizada) {
      return { success: false, error: 'Esta compra ya fue calificada.' };
    }

    const nuevaResenia = normalizarResenia({
      id: `res-${Date.now()}`,
      comprador: compra.compradorNombre,
      puntuacion: Number(puntuacion),
      detalle: comentario,
      fecha: 'Reciente',
    });
    setCompras((prev) =>
      prev.map((item) =>
        item.id === compraId ? { ...item, reseniaRealizada: true } : item
      )
    );
    setEventos((prev) =>
      prev.map((evento) =>
        evento.id === compra.eventoId
          ? {
              ...evento,
              reseniasAnteriores: [nuevaResenia, ...(evento.reseniasAnteriores || [])],
            }
          : evento
      )
    );
    return { success: true };
  };

  const crearEvento = async (nuevoEvento) => {
    if (currentUser.rol !== 'organizador') {
      return { success: false, error: 'Seleccioná un perfil organizador para publicar un evento.' };
    }
    const { imagenes = [], ...datosEvento } = nuevoEvento;
    if (await backendDisponible()) {
      const eventoServidor = await api.crearEvento({
        ...datosEvento,
        organizadorId: currentUser.id,
      }, imagenes);
      const evento = normalizarEvento(eventoServidor);
      setEventos((prev) => [evento, ...prev.filter((item) => item.id !== evento.id)]);
      return { success: true, evento };
    }

    const evento = normalizarEvento({
      ...datosEvento,
      id: `evt-${Date.now()}`,
      destacado: false,
      imagen: imagenes[0]?.uri || datosEvento.imagen || '',
      multimedia: imagenes.map((imagen) => imagen.uri),
      organizador: currentUser.nombre,
      organizadorId: currentUser.id,
      organizadorRating: currentUser.rating || 5,
      totalResenias: 0,
      reseniasAnteriores: [],
    });
    setEventos((prev) => [evento, ...prev]);
    return { success: true, evento };
  };

  const actualizarEvento = async (eventoId, cambios) => {
    const eventoActual = eventos.find((item) => item.id === eventoId);
    if (!eventoActual || eventoActual.organizadorId !== currentUser.id) {
      return { success: false, error: 'Este evento no pertenece al organizador seleccionado.' };
    }
    const { imagenes = [], ...datosCambios } = cambios;

    if (await backendDisponible()) {
      const eventoServidor = await api.actualizarEvento(eventoId, {
        ...datosCambios,
        organizadorId: currentUser.id,
      }, imagenes);
      const eventoActualizado = normalizarEvento(eventoServidor);
      setEventos((prev) =>
        prev.map((item) => (item.id === eventoId ? eventoActualizado : item))
      );
      return { success: true, evento: eventoActualizado };
    }

    const imagenNueva = imagenes[0]?.uri;
    const eventoActualizado = normalizarEvento({
      ...eventoActual,
      ...datosCambios,
      ...(imagenNueva ? { imagen: imagenNueva, multimedia: [imagenNueva] } : {}),
      ...(datosCambios.imagen === '' ? { imagen: '', multimedia: [] } : {}),
    });
    setEventos((prev) =>
      prev.map((item) => (item.id === eventoId ? eventoActualizado : item))
    );
    return { success: true, evento: eventoActualizado };
  };

  const marcarEntradaUtilizada = async (codigoOId) => {
    const compra = compras.find(
      (item) => item.id === codigoOId || item.ordenCodigo === codigoOId
    );
    if (!compra || compra.organizadorId !== currentUser.id) {
      return { success: false, error: 'Esta entrada no pertenece a un evento del organizador seleccionado.' };
    }

    if (await backendDisponible()) {
      const compraServidor = await api.marcarUtilizada(compra.id, 'Acreditación en Puerta');
      return { success: true, compra: guardarCompraServidor(compraServidor) };
    }
    if (compra.estado !== 'CONFIRMADA') {
      return { success: false, error: 'Solo se pueden acreditar entradas confirmadas.' };
    }

    setCompras((prev) =>
      prev.map((item) =>
        item.id === compra.id ? { ...item, estado: 'UTILIZADA' } : item
      )
    );
    return { success: true, compra: { ...compra, estado: 'UTILIZADA' } };
  };

  return (
    <AppContext.Provider
      value={{
        usuarios,
        categorias,
        seleccionarUsuario,
        currentUser,
        currentUserId,
        eventos,
        compras,
        favoritos,
        favoritosError,
        backendConectado: backendStatus === 'connected',
        sincronizarConBackend,
        toggleFavorito,
        getDiasRestantes,
        comprarEntrada,
        cancelarCompra,
        enviarMensaje,
        marcarMensajesLeidos,
        calificarEvento,
        crearEvento,
        actualizarEvento,
        marcarEntradaUtilizada,
      }}
    >
      {USE_MOCK_DATA || (backendStatus === 'connected' && currentUser) ? (
        children
      ) : (
        <View style={styles.startupContainer}>
          {backendStatus === 'checking' ? (
            <>
              <ActivityIndicator size="large" color={COLORS.tertiary} />
              <Text style={styles.startupText}>Conectando con el backend...</Text>
            </>
          ) : (
            <>
              <Text style={styles.startupTitle}>No se pudo cargar la aplicación</Text>
              <Text style={styles.startupText}>
                {backendErrorRef.current?.message ||
                  'No hay conexión con el backend. Iniciá el servidor e intentá nuevamente.'}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={sincronizarConBackend}
                accessibilityRole="button"
              >
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </AppContext.Provider>
  );
};

const styles = StyleSheet.create({
  startupContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.background,
  },
  startupTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  startupText: {
    color: COLORS.textSecondary,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.tertiary,
  },
  retryButtonText: {
    color: COLORS.background,
    fontWeight: '700',
  },
});

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
