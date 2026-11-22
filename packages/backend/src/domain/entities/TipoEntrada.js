import { CupoInsuficienteError, ReglaNegocioError } from '../errors/index.js';

export class TipoEntrada {
  constructor({
    id,
    nombre,
    descripcion = '',
    precio = 0,
    cupo = 0,
    disponibles = null,
  }) {
    const precioNumerico = precio;
    const cupoNumerico = cupo;
    const disponiblesNumericos =
      disponibles !== null && disponibles !== undefined
        ? disponibles
        : cupoNumerico;
    if (typeof nombre !== 'string' || !nombre.trim()) {
      throw new ReglaNegocioError('TipoEntrada requiere un nombre válido');
    }
    if (typeof precioNumerico !== 'number' || !Number.isFinite(precioNumerico) || precioNumerico < 0) {
      throw new ReglaNegocioError('El precio del tipo de entrada debe ser válido y no negativo');
    }
    if (!Number.isSafeInteger(cupoNumerico) || cupoNumerico <= 0) {
      throw new ReglaNegocioError('El cupo del tipo de entrada debe ser un entero positivo');
    }
    if (
      !Number.isSafeInteger(disponiblesNumericos) ||
      disponiblesNumericos < 0 ||
      disponiblesNumericos > cupoNumerico
    ) {
      throw new ReglaNegocioError('El cupo disponible debe estar entre cero y el cupo total');
    }

    this.id          = id;
    this.nombre      = nombre.trim();
    this.descripcion = descripcion;
    this.precio      = precioNumerico;
    this.cupo        = cupoNumerico;
    this.disponibles = disponiblesNumericos;
  }

  // Método explícito del diagrama de clases
  hayCupoPara(cantidad) {
    return Number.isSafeInteger(cantidad) && this.disponibles >= cantidad && cantidad > 0;
  }

  descontarCupo(cantidad) {
    const cant = cantidad;
    if (!this.hayCupoPara(cant)) {
      throw new CupoInsuficienteError(this.nombre, cant, this.disponibles);
    }
    this.disponibles -= cant;
  }

  restituirCupo(cantidad) {
    if (!Number.isSafeInteger(cantidad) || cantidad <= 0) {
      throw new ReglaNegocioError('La cantidad a restituir debe ser un entero positivo');
    }
    const cant = cantidad;
    this.disponibles = Math.min(this.cupo, this.disponibles + cant);
  }
}
