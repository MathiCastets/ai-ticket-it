export { DomainError } from './DomainError.js';
import { DomainError } from './DomainError.js';

export class CupoInsuficienteError extends DomainError {
  constructor(tipoEntradaNombre, solicitados, disponibles) {
    super(
      `No hay cupo suficiente para '${tipoEntradaNombre}'. Solicitados: ${solicitados}, Disponibles: ${disponibles}`,
      'CUPO_INSUFICIENTE'
    );
    this.tipoEntradaNombre = tipoEntradaNombre;
    this.solicitados = solicitados;
    this.disponibles = disponibles;
  }
}

export class EstadoCompraInvalidoError extends DomainError {
  constructor(estadoActual, nuevoEstado) {
    super(
      `Transición de estado no permitida desde '${estadoActual}' hacia '${nuevoEstado}'`,
      'TRANSICION_ESTADO_INVALIDA'
    );
    this.estadoActual = estadoActual;
    this.nuevoEstado = nuevoEstado;
  }
}

export class ReglaNegocioError extends DomainError {
  constructor(message, code = 'REGLA_NEGOCIO_ERROR') {
    super(message, code);
  }
}
