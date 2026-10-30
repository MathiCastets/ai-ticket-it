import React, { createContext, useContext, useState } from 'react';
import { EVENTOS_INICIALES, COMPRAS_INICIALES, USUARIOS } from '../data/mockData';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [userRole, setUserRole] = useState('comprador'); // 'comprador' | 'organizador'
  const [eventos, setEventos] = useState(EVENTOS_INICIALES);
  const [compras, setCompras] = useState(COMPRAS_INICIALES);
  const [favoritos, setFavoritos] = useState(['evt-utn-2026']);

  // Toggle user role between Comprador and Organizador (ideal for demo presentation)
  const toggleUserRole = () => {
    setUserRole((prev) => (prev === 'comprador' ? 'organizador' : 'comprador'));
  };

  const currentUser = userRole === 'comprador' ? USUARIOS.comprador : USUARIOS.organizador;

  // Toggle favorite event
  const toggleFavorito = (eventoId) => {
    setFavoritos((prev) =>
      prev.includes(eventoId) ? prev.filter((id) => id !== eventoId) : [...prev, eventoId]
    );
  };

  // Helper: Calculate days remaining for confirmed purchase
  const getDiasRestantes = (fechaString) => {
    try {
      const fechaEvento = new Date(fechaString);
      const hoy = new Date();
      const diffTime = fechaEvento.getTime() - hoy.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return 0;
    }
  };

  // Purchase ticket flow
  const comprarEntrada = ({ eventoId, tipoEntradaId, cantidad }) => {
    const evento = eventos.find((e) => e.id === eventoId);
    if (!evento) return { success: false, error: 'Evento no encontrado' };

    const tipo = evento.tiposEntrada.find((t) => t.id === tipoEntradaId);
    if (!tipo) return { success: false, error: 'Tipo de entrada no encontrado' };

    if (tipo.disponibles < cantidad) {
      return { success: false, error: 'No hay cupo suficiente disponible' };
    }

    // Deduct stock from event
    const eventosActualizados = eventos.map((e) => {
      if (e.id === eventoId) {
        return {
          ...e,
          tiposEntrada: e.tiposEntrada.map((t) =>
            t.id === tipoEntradaId ? { ...t, disponibles: t.disponibles - cantidad } : t
          ),
        };
      }
      return e;
    });
    setEventos(eventosActualizados);

    // Create purchase record
    const nuevaCompra = {
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
      compradorNombre: currentUser.nombre + ' ' + currentUser.apellido,
      organizadorNombre: evento.organizador,
      organizadorId: evento.organizadorId,
      imagen: evento.imagen,
      ubicacion: evento.ubicacion,
      reseniaRealizada: false,
      mensajes: [],
    };

    setCompras((prev) => [nuevaCompra, ...prev]);
    return { success: true, compra: nuevaCompra };
  };

  // Cancel purchase flow (TP requirement: only if not UTILIZADA and event has not yet occurred)
  const cancelarCompra = (compraId) => {
    const compra = compras.find((c) => c.id === compraId);
    if (!compra) return { success: false, error: 'Compra no encontrada' };

    if (compra.estado === 'UTILIZADA') {
      return { success: false, error: 'No se puede cancelar una entrada ya utilizada.' };
    }

    const fechaEvento = new Date(compra.eventoFecha);
    if (fechaEvento.getTime() < Date.now()) {
      return { success: false, error: 'El evento ya se ha realizado.' };
    }

    // Restore stock to event
    setEventos((prev) =>
      prev.map((e) => {
        if (e.id === compra.eventoId) {
          return {
            ...e,
            tiposEntrada: e.tiposEntrada.map((t) =>
              t.id === compra.tipoEntradaId ? { ...t, disponibles: t.disponibles + compra.cantidad } : t
            ),
          };
        }
        return e;
      })
    );

    // Update purchase status to REEMBOLSADA
    setCompras((prev) =>
      prev.map((c) => (c.id === compraId ? { ...c, estado: 'REEMBOLSADA' } : c))
    );

    return { success: true, mensaje: 'Compra cancelada y reembolsada con éxito' };
  };

  // Send message in purchase chat
  const enviarMensaje = (compraId, texto) => {
    if (!texto.trim()) return;

    const nuevoMensaje = {
      id: `msg-${Date.now()}`,
      emisor: userRole,
      usuario: userRole === 'comprador' ? 'Mathi Castets' : 'Producciones Sonora',
      texto: texto.trim(),
      fechaHora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setCompras((prev) =>
      prev.map((c) => {
        if (c.id === compraId) {
          return { ...c, mensajes: [...(c.mensajes || []), nuevoMensaje] };
        }
        return c;
      })
    );
  };

  // Submit rating / review after ticket is used
  const calificarEvento = ({ compraId, puntuacion, comentario }) => {
    const compra = compras.find((c) => c.id === compraId);
    if (!compra) return { success: false, error: 'Compra no encontrada' };

    // Mark purchase as reviewed
    setCompras((prev) =>
      prev.map((c) => (c.id === compraId ? { ...c, reseniaRealizada: true } : c))
    );

    // Add review to event
    const nuevaResenia = {
      id: `res-${Date.now()}`,
      comprador: compra.compradorNombre,
      puntuacion: Number(puntuacion),
      detalle: comentario,
      fecha: 'Reciente',
    };

    setEventos((prev) =>
      prev.map((e) => {
        if (e.id === compra.eventoId) {
          const resenias = e.reseniasAnteriores ? [nuevaResenia, ...e.reseniasAnteriores] : [nuevaResenia];
          return { ...e, reseniasAnteriores: resenias };
        }
        return e;
      })
    );

    return { success: true };
  };

  // Organizer: Create new event
  const crearEvento = (nuevoEvento) => {
    const id = `evt-${Date.now()}`;
    const eventoCompleto = {
      ...nuevoEvento,
      id,
      destacado: false,
      organizador: 'Producciones Sonora',
      organizadorId: 'user_org_sonora',
      organizadorRating: 5.0,
      totalResenias: 0,
      reseniasAnteriores: [],
    };

    setEventos((prev) => [eventoCompleto, ...prev]);
    return { success: true, evento: eventoCompleto };
  };

  // Organizer: Scan ticket to mark as UTILIZADA
  const marcarEntradaUtilizada = (codigoOId) => {
    let encontrada = false;
    setCompras((prev) =>
      prev.map((c) => {
        if (c.id === codigoOId || c.ordenCodigo === codigoOId) {
          encontrada = true;
          return { ...c, estado: 'UTILIZADA' };
        }
        return c;
      })
    );
    return encontrada;
  };

  return (
    <AppContext.Provider
      value={{
        userRole,
        setUserRole,
        toggleUserRole,
        currentUser,
        eventos,
        compras,
        favoritos,
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
