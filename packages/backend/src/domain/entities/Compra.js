import { EstadoCompra, EstadosValidos } from '../enums/EstadoCompra.js';
import { CambioEstadoCompra } from './CambioEstadoCompra.js';
import {
  EstadoCompraInvalidoError,
  ReglaNegocioError,
} from '../errors/index.js';

const MARGEN_CIERRE_CONVERSACION_MS = 48 * 60 * 60 * 1000;

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

  // Método explícito del diagrama de clases
  actualizarEstado(nuevoEstado, quien, motivo = '') {
    if (!EstadosValidos.includes(nuevoEstado)) {
      throw new EstadoCompraInvalidoError(this.estado, nuevoEstado);
    }
    if (this.estado === nuevoEstado) return;

    if (this.estado === EstadoCompra.CANCELADA || this.estado === EstadoCompra.REEMBOLSADA) {
      throw new EstadoCompraInvalidoError(
        this.estado,
        nuevoEstado,
        'Una compra cancelada o reembolsada no puede cambiar de estado'
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

  cancelarParaReembolso(quien) {
    const check = this.puedeCancelarse();
    if (!check.puede) {
      throw new ReglaNegocioError(check.razon, 'CANCELACION_NO_PERMITIDA');
    }
    this.actualizarEstado(EstadoCompra.REEMBOLSADA, quien, 'Cancelación solicitada por comprador');
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

  diasFaltantes() {
    const diffTime = this.evento.fecha.getTime() - Date.now();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  toJSON() {
    return {
      id: this.id,
      ordenCodigo: this.ordenCodigo,
      comprador: this.comprador,
      evento: this.evento,
      tipoEntrada: this.tipoEntrada,
      cantidad: this.cantidad,
      total: this.total,
      estado: this.estado,
      fechaHora: this.fechaHora,
      mensajes: this.mensajes,
      historialCambios: this.historialCambios,
      reseniaRealizada: this.reseniaRealizada,
      // Helpers calculados para serialización REST / compatibilidad de vistas
      compradorId: this.comprador?.id,
      compradorNombre: this.comprador ? `${this.comprador.nombre} ${this.comprador.apellido || ''}`.trim() : '',
      eventoId: this.evento?.id,
      eventoNombre: this.evento?.nombre,
      eventoFecha: this.evento?.fecha,
      eventoFechaTexto: this.evento?.fechaTexto,
      tipoEntradaId: this.tipoEntrada?.id,
      tipoEntradaNombre: this.tipoEntrada?.nombre,
      organizadorId: this.evento?.organizador?.id || '',
      organizadorNombre: typeof this.evento?.organizador === 'object' ? this.evento.organizador?.nombre : (this.evento?.organizador || ''),
      imagen: this.evento?.imagen || '',
      ubicacion: this.evento?.ubicacion || '',
    };
  }
}
