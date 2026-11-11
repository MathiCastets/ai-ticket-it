import { EstadoCompra, EstadosValidos } from '../enums/EstadoCompra.js';
import { CambioEstadoCompra } from './CambioEstadoCompra.js';
import {
  EstadoCompraInvalidoError,
  ReglaNegocioError,
} from '../errors/index.js';

const MARGEN_CIERRE_CONVERSACION_MS = 48 * 60 * 60 * 1000;

export const TRANSICIONES_PERMITIDAS = Object.freeze({
  [EstadoCompra.PENDIENTE]: Object.freeze([
    EstadoCompra.CONFIRMADA,
    EstadoCompra.CANCELADA,
  ]),
  [EstadoCompra.CONFIRMADA]: Object.freeze([
    EstadoCompra.UTILIZADA,
    EstadoCompra.REEMBOLSADA,
    EstadoCompra.CANCELADA,
  ]),
  [EstadoCompra.UTILIZADA]: Object.freeze([]),
  [EstadoCompra.CANCELADA]: Object.freeze([]),
  [EstadoCompra.REEMBOLSADA]: Object.freeze([]),
});

export class Compra {
  constructor({
    id,
    ordenCodigo,
    comprador,   // Usuario (referencia directa)
    evento,      // Evento (referencia directa)
    tipoEntrada, // TipoEntrada (referencia directa al tipo dentro de evento)
    cantidad = 1,
    total = 0,
    estado = EstadoCompra.CONFIRMADA,
    fechaHora = new Date(),
    mensajes = [],
    historialCambios = [],
    reseniaRealizada = false,
  }) {
    if (!comprador) throw new Error('Compra requiere un comprador (Usuario)');
    if (!evento)    throw new Error('Compra requiere un evento (Evento)');
    if (!tipoEntrada) throw new Error('Compra requiere un tipoEntrada (TipoEntrada)');

    this.id = id || `compra-${Date.now()}`;
    this.ordenCodigo = ordenCodigo || `#TK-${Math.floor(10000 + Math.random() * 90000)}`;

    this.comprador  = comprador;   // Usuario
    this.evento     = evento;      // Evento
    this.tipoEntrada = tipoEntrada; // TipoEntrada

    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
      throw new ReglaNegocioError('La cantidad de entradas debe ser un entero positivo');
    }
    if (!Number.isFinite(total) || total < 0) {
      throw new ReglaNegocioError('El total de la compra debe ser válido y no negativo');
    }
    if (!EstadosValidos.includes(estado)) {
      throw new ReglaNegocioError(`El estado inicial '${estado}' no es válido`);
    }

    this.cantidad = cantidad;
    this.total    = total;
    this.estado   = estado;
    this.fechaHora = new Date(fechaHora);

    this.mensajes         = Array.isArray(mensajes)         ? mensajes         : [];
    this.historialCambios = Array.isArray(historialCambios) ? historialCambios : [];
    this.reseniaRealizada = Boolean(reseniaRealizada);
  }

  // Método explícito del diagrama de clases con máquina de estados
  actualizarEstado(nuevoEstado, quien, motivo = '') {
    if (!EstadosValidos.includes(nuevoEstado)) {
      throw new EstadoCompraInvalidoError(this.estado, nuevoEstado);
    }
    if (this.estado === nuevoEstado) return;

    const permitidos = TRANSICIONES_PERMITIDAS[this.estado];
    if (!permitidos.includes(nuevoEstado)) {
      throw new EstadoCompraInvalidoError(
        this.estado,
        nuevoEstado,
        `Transición no permitida desde '${this.estado}' hacia '${nuevoEstado}'`
      );
    }

    const cambio = new CambioEstadoCompra({
      compraId: this.id,  // id solamente, evita referencia circular al serializar
      estado: nuevoEstado,
      quien,
      motivo,
      fechaHora: new Date(),
    });

    this.estado = nuevoEstado;
    this.historialCambios.push(cambio);
  }

  // Regla explícita del TP: solo cancelable si no está utilizada y el evento no ocurrió
  puedeCancelarse() {
    if (this.estado === EstadoCompra.UTILIZADA) {
      return { puede: false, razon: 'No se puede cancelar una entrada que ya ha sido utilizada.' };
    }
    if (this.estado === EstadoCompra.CANCELADA || this.estado === EstadoCompra.REEMBOLSADA) {
      return { puede: false, razon: 'La compra ya se encuentra cancelada o reembolsada.' };
    }
    if (this.evento.fecha.getTime() < Date.now()) {
      return { puede: false, razon: 'No se puede cancelar porque el evento ya se ha realizado.' };
    }
    return { puede: true };
  }

  assertPuedeCancelarse() {
    const check = this.puedeCancelarse();
    if (!check.puede) {
      throw new ReglaNegocioError(check.razon, 'CANCELACION_NO_PERMITIDA');
    }
  }

  cancelarParaReembolso(quien) {
    this.assertPuedeCancelarse();
    const estadoDestino = this.estado === EstadoCompra.PENDIENTE
      ? EstadoCompra.CANCELADA
      : EstadoCompra.REEMBOLSADA;
    this.actualizarEstado(estadoDestino, quien, 'Cancelación solicitada por comprador');
  }

  marcarComoUtilizada(quien) {
    if (this.estado !== EstadoCompra.CONFIRMADA) {
      throw new ReglaNegocioError(
        `Solo se pueden acreditar entradas en estado CONFIRMADA (estado actual: ${this.estado})`,
        'ACREDITACION_INVALIDA'
      );
    }
    this.actualizarEstado(EstadoCompra.UTILIZADA, quien, 'Acreditación en puerta exitosa');
  }

  agregarMensaje(mensaje) {
    this.mensajes.push(mensaje);
  }

  estaConversacionCerrada(ahora = Date.now()) {
    const fechaEvento = new Date(this.evento.fecha).getTime();
    if (!Number.isFinite(fechaEvento)) return false;

    const ultimoMensaje = this.mensajes.reduce((ultimaFecha, mensaje) => {
      const fechaMensaje = new Date(mensaje.enviado).getTime();
      return Number.isFinite(fechaMensaje) ? Math.max(ultimaFecha, fechaMensaje) : ultimaFecha;
    }, Number.NEGATIVE_INFINITY);
    const ultimaActividad = Math.max(fechaEvento, ultimoMensaje);
    const ahoraMs = ahora instanceof Date ? ahora.getTime() : Number(ahora);

    return Number.isFinite(ahoraMs) && ahoraMs - ultimaActividad >= MARGEN_CIERRE_CONVERSACION_MS;
  }

  esComprador(usuarioId) {
    return Boolean(usuarioId) && this.comprador.id === usuarioId;
  }

  esOrganizador(usuarioId) {
    if (!usuarioId) return false;
    if (typeof this.evento.esOrganizador === 'function') {
      return this.evento.esOrganizador(usuarioId);
    }
    const orgId = this.evento.organizador?.id || this.evento.organizadorId;
    return orgId === usuarioId;
  }

  puedeSerVistaPor(actor) {
    if (!actor || !actor.id) return false;
    return this.esComprador(actor.id) || this.esOrganizador(actor.id);
  }

  diasFaltantes() {
    const diffTime = this.evento.fecha.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  toJSON() {
    let compradorJson = this.comprador;
    if (typeof this.comprador.toJSON === 'function') {
      compradorJson = this.comprador.toJSON();
    } else if (typeof this.comprador === 'object' && this.comprador !== null) {
      const { email: _email, ...resto } = this.comprador;
      compradorJson = resto;
    }

    const eventoJson = typeof this.evento.toJSON === 'function' ? this.evento.toJSON() : this.evento;
    const tipoEntradaJson =
      typeof this.tipoEntrada.toJSON === 'function' ? this.tipoEntrada.toJSON() : this.tipoEntrada;
    const mensajesJson = this.mensajes.map((m) =>
      typeof m?.toJSON === 'function' ? m.toJSON() : m
    );

    const organizadorNombre =
      eventoJson.organizadorNombre ||
      (typeof this.evento.organizador === 'object' && this.evento.organizador !== null
        ? this.evento.organizador.nombreCompleto || this.evento.organizador.nombre
        : this.evento.organizador || '');

    const organizadorId =
      this.evento.organizadorId || this.evento.organizador?.id || '';

    return {
      id: this.id,
      ordenCodigo: this.ordenCodigo,
      comprador: compradorJson,
      evento: eventoJson,
      tipoEntrada: tipoEntradaJson,
      cantidad: this.cantidad,
      total: this.total,
      estado: this.estado,
      fechaHora: this.fechaHora,
      mensajes: mensajesJson,
      historialCambios: this.historialCambios,
      reseniaRealizada: this.reseniaRealizada,
      // Helpers calculados para serialización REST / compatibilidad de vistas
      compradorId: this.comprador.id,
      compradorNombre: this.comprador.nombreCompleto || `${this.comprador.nombre} ${this.comprador.apellido || ''}`.trim(),
      eventoId: this.evento.id,
      eventoNombre: this.evento.nombre,
      eventoFecha: this.evento.fecha,
      tipoEntradaId: this.tipoEntrada.id,
      tipoEntradaNombre: this.tipoEntrada.nombre,
      organizadorId,
      organizadorNombre,
      imagen: this.evento.imagen || '',
      ubicacion: this.evento.ubicacion || '',
      conversacionCerrada: this.estaConversacionCerrada(),
    };
  }
}
