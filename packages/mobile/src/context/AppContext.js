import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { EVENTOS_INICIALES, COMPRAS_INICIALES, USUARIOS } from '../data/mockData';
import { USE_MOCK_DATA } from '../config/apiConfig';
import { api } from '../services/api';

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
  imagen: compra.imagen || compra.evento?.imagen || '',
  ubicacion: compra.ubicacion || compra.evento?.ubicacion || '',
  mensajes: (compra.mensajes || []).map(normalizarMensaje),
});

const USUARIO_INICIAL_ID = 'user_comprador_1';

export const AppProvider = ({ children }) => {
  const [currentUserId, setCurrentUserId] = useState(USUARIO_INICIAL_ID);
  const [eventos, setEventos] = useState(EVENTOS_INICIALES.map(normalizarEvento));
  const [compras, setCompras] = useState(COMPRAS_INICIALES.map(normalizarCompra));
  const initialUser = USUARIOS.find((user) => user.id === USUARIO_INICIAL_ID);
  const [favoritos, setFavoritos] = useState(initialUser.favoritos);
  const [favoritosError, setFavoritosError] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');
  const backendStatusRef = useRef('checking');
  const backendErrorRef = useRef(null);
  const initialSyncPromise = useRef(null);
  const favoritosRef = useRef(initialUser.favoritos);
  const favoritosPorUsuarioRef = useRef(
    new Map(USUARIOS.map((user) => [user.id, user.favoritos || []]))
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
        '[AI Ticket It Mobile] Backend no disponible; se conservan datos de demostración y se bloquean las mutaciones.',
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

    let eventosApi;
    let comprasApi;
    try {
      [eventosApi, comprasApi] = await Promise.all([
        api.getEventos(),
        api.getCompras(),
      ]);
    } catch (error) {
      actualizarEstadoBackend('error', error);
      console.error('[AI Ticket It Mobile] No se pudieron sincronizar los datos iniciales.', error);
      return false;
    }

    if (!Array.isArray(eventosApi) || !Array.isArray(comprasApi)) {
      const error = new Error('El backend devolvió un formato de datos inesperado.');
      actualizarEstadoBackend('error', error);
      console.error('[AI Ticket It Mobile]', error.message);
      return false;
    }

    setEventos(eventosApi.map(normalizarEvento));
    setCompras(comprasApi.map(normalizarCompra));
    actualizarEstadoBackend('connected');
    console.info('[AI Ticket It Mobile] Conectado exitosamente con el backend Express');
    return true;
  }, []);

  useEffect(() => {
    initialSyncPromise.current = sincronizarConBackend();
  }, [sincronizarConBackend]);

  const backendDisponible = async () => {
    if (backendStatusRef.current === 'checking' && initialSyncPromise.current) {
      await initialSyncPromise.current;
    }
    if (backendStatusRef.current === 'offline' && !USE_MOCK_DATA) {
      await sincronizarConBackend();
    }
    if (backendStatusRef.current === 'error') {
      throw new Error(
        backendErrorRef.current?.message ||
          'El backend respondió, pero no se pudo completar la sincronización.'
      );
    }
    if (backendStatusRef.current === 'offline' && !USE_MOCK_DATA) {
      throw new Error('No hay conexión con el backend. Iniciá el servidor e intentá nuevamente.');
    }
    return backendStatusRef.current === 'connected';
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

  const currentUser = USUARIOS.find((user) => user.id === currentUserId) || USUARIOS[0];
  const seleccionarUsuario = (usuarioId) => {
    if (USUARIOS.some((user) => user.id === usuarioId)) {
      setCurrentUserId(usuarioId);
    }
  };

  useEffect(() => {
    let active = true;

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
          USUARIOS.find((user) => user.id === usuarioId)?.favoritos ||
          [];
        const adding = !userFavorites.includes(eventoId);
        updated = adding
          ? await api.agregarFavorito(usuarioId, eventoId)
          : await api.removerFavorito(usuarioId, eventoId);
      } else {
        const userFavorites =
          favoritosPorUsuarioRef.current.get(usuarioId) ||
          USUARIOS.find((user) => user.id === usuarioId)?.favoritos ||
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
      emisor: currentUser.rol,
      usuario: currentUser.nombreCompleto || `${currentUser.nombre} ${currentUser.apellido || ''}`.trim(),
      texto: textoLimpio,
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
    if (await backendDisponible()) {
      const eventoServidor = await api.crearEvento({
        ...nuevoEvento,
        organizadorId: currentUser.id,
      });
      const evento = normalizarEvento(eventoServidor);
      setEventos((prev) => [evento, ...prev.filter((item) => item.id !== evento.id)]);
      return { success: true, evento };
    }

    const evento = normalizarEvento({
      ...nuevoEvento,
      id: `evt-${Date.now()}`,
      destacado: false,
      organizador: currentUser.nombre,
      organizadorId: currentUser.id,
      organizadorRating: currentUser.rating || 5,
      totalResenias: 0,
      reseniasAnteriores: [],
    });
    setEventos((prev) => [evento, ...prev]);
    return { success: true, evento };
  };

  const marcarEntradaUtilizada = async (codigoOId) => {
    const compra = compras.find(
      (item) => item.id === codigoOId || item.ordenCodigo === codigoOId
    );
    if (!compra || compra.compradorId !== currentUser.id) {
      return { success: false, error: 'Esta compra no pertenece al usuario seleccionado.' };
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
        usuarios: USUARIOS,
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
        calificarEvento,
        crearEvento,
        marcarEntradaUtilizada,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
