import { resolverImagen } from '../config/apiConfig';

export const obtenerNombreUsuario = (usuario) => {
  if (!usuario) return '';
  if (typeof usuario === 'string') return usuario;
  return `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim();
};

export const normalizarMensaje = (mensaje) => {
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

export const normalizarResenia = (resenia) => ({
  ...resenia,
  comprador: obtenerNombreUsuario(resenia.comprador) || 'Comprador',
  detalle: resenia.detalle || resenia.comentario || '',
  fecha:
    resenia.fecha ||
    (resenia.fechaHora
      ? new Date(resenia.fechaHora).toLocaleDateString('es-AR')
      : 'Reciente'),
});

export const formatearFechaEvento = (fecha) => {
  if (!fecha) return '';
  const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(fechaObj.getTime())) return String(fecha);
  const diaMesAnio = fechaObj.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const horaMin = fechaObj.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${diaMesAnio} • ${horaMin} hs`;
};

export const normalizarEvento = (evento) => {
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
    organizadorRating:
      evento.organizadorRating !== undefined
        ? evento.organizadorRating
        : organizadorObj?.rating ?? 5,
    fechaTexto: evento.fechaTexto || formatearFechaEvento(evento.fecha),
    reseniasAnteriores: (evento.reseniasAnteriores || evento.resenias || []).map(normalizarResenia),
  };
};

export const normalizarCompra = (compra) => ({
  ...compra,
  fechaHora: compra.fechaHora || null,
  eventoId: compra.eventoId || compra.evento?.id || '',
  eventoNombre: compra.eventoNombre || compra.evento?.nombre || '',
  eventoFecha: compra.eventoFecha || compra.evento?.fecha || '',
  eventoFechaTexto:
    compra.eventoFechaTexto ||
    compra.evento?.fechaTexto ||
    formatearFechaEvento(compra.eventoFecha || compra.evento?.fecha),
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
  conversacionCerrada: compra.conversacionCerrada === true,
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

export const normalizarUsuario = (usuario) => ({
  ...usuario,
  nombreCompleto: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim(),
  favoritos: Array.isArray(usuario.favoritos) ? usuario.favoritos : [],
});
