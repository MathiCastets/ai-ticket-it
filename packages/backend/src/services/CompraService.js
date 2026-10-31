import { randomUUID } from 'node:crypto';
import { Compra } from '../domain/entities/Compra.js';
import { Resenia } from '../domain/entities/Resenia.js';
import { EstadoCompra } from '../domain/enums/EstadoCompra.js';
import { compraRepository } from '../repositories/inMemory/CompraRepository.js';
import { eventoRepository } from '../repositories/inMemory/EventoRepository.js';
import { usuarioRepository } from '../repositories/inMemory/UsuarioRepository.js';
import { EntityNotFoundError } from '../repositories/errors/EntityNotFoundError.js';
import { ResourceNotFoundError, BusinessRuleError } from './errors/index.js';

export class CompraService {
  constructor(
    _compraRepository = compraRepository,
    _eventoRepository = eventoRepository,
    _usuarioRepository = usuarioRepository
  ) {
    this.compraRepository  = _compraRepository;
    this.eventoRepository  = _eventoRepository;
    this.usuarioRepository = _usuarioRepository;
    this.mutationQueue = Promise.resolve();
  }

  #serializarMutacion(operation) {
    const result = this.mutationQueue.then(operation);
    this.mutationQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  async #revertirMutacion(errorOriginal, operacionesRollback, mensaje) {
    const erroresRollback = [];
    for (const rollback of operacionesRollback) {
      try {
        await rollback();
      } catch (errorRollback) {
        erroresRollback.push(errorRollback);
      }
    }

    if (erroresRollback.length > 0) {
      throw new AggregateError(
        [errorOriginal, ...erroresRollback],
        `${mensaje}. Además, falló una o más operaciones de rollback.`
      );
    }
    throw errorOriginal;
  }

  async obtenerPorId(id) {
    try {
      return await this.compraRepository.findById(id);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new ResourceNotFoundError('Compra', id);
      }
      throw error;
    }
  }

  async listarPorComprador(compradorId) {
    return await this.compraRepository.findByCompradorId(compradorId);
  }

  async listarPorEvento(eventoId) {
    return await this.compraRepository.findByEventoId(eventoId);
  }

  async listarTodas() {
    return await this.compraRepository.findAll();
  }

  async realizarCompra({ compradorId, eventoId, tipoEntradaId, cantidad }) {
    if (typeof cantidad !== 'number' || !Number.isSafeInteger(cantidad) || cantidad <= 0) {
      throw new BusinessRuleError('La cantidad de entradas debe ser un número entero mayor a 0');
    }
    const cant = cantidad;

    return this.#serializarMutacion(async () => {
      let comprador;
      try {
        comprador = await this.usuarioRepository.findById(compradorId);
      } catch (error) {
        if (error instanceof EntityNotFoundError) {
          throw new ResourceNotFoundError('Usuario (comprador)', compradorId);
        }
        throw error;
      }

      let evento;
      try {
        evento = await this.eventoRepository.findById(eventoId);
      } catch (error) {
        if (error instanceof EntityNotFoundError) {
          throw new ResourceNotFoundError('Evento', eventoId);
        }
        throw error;
      }

      const tipoEntrada = evento.obtenerTipoEntrada(tipoEntradaId);
      if (!tipoEntrada) {
        throw new ResourceNotFoundError('TipoEntrada', tipoEntradaId);
      }

      const compra = new Compra({
        id: `compra-${randomUUID()}`,
        comprador,
        evento,
        tipoEntrada,
        cantidad: cant,
        total: tipoEntrada.precio * cant,
        estado: EstadoCompra.CONFIRMADA,
      });
      const disponiblesAntes = tipoEntrada.disponibles;
      tipoEntrada.descontarCupo(cant);

      try {
        await this.eventoRepository.save(evento);
        await this.compraRepository.save(compra);
        return compra;
      } catch (error) {
        tipoEntrada.disponibles = disponiblesAntes;
        await this.#revertirMutacion(
          error,
          [
            () => this.compraRepository.delete(compra.id),
            () => this.eventoRepository.save(evento),
          ],
          'No se pudo completar la compra de forma consistente'
        );
      }
    });
  }

  async cancelarCompra(compraId, quien = 'Comprador') {
    return this.#serializarMutacion(async () => {
      const compra = await this.obtenerPorId(compraId);
      if (!compra.puedeCancelarse().puede) {
        compra.cancelarParaReembolso(quien);
      }

      const tipoEntrada = compra.evento.obtenerTipoEntrada(compra.tipoEntrada.id);
      if (!tipoEntrada) {
        throw new BusinessRuleError(
          'No se puede cancelar la compra porque su tipo de entrada ya no existe en el evento.',
          'TIPO_ENTRADA_NO_DISPONIBLE'
        );
      }

      const disponiblesAntes = tipoEntrada.disponibles;
      const estadoAntes = compra.estado;
      const historialAntes = [...compra.historialCambios];

      try {
        compra.cancelarParaReembolso(quien);
        tipoEntrada.restituirCupo(compra.cantidad);
        await this.eventoRepository.save(compra.evento);
        await this.compraRepository.save(compra);
        return compra;
      } catch (error) {
        tipoEntrada.disponibles = disponiblesAntes;
        compra.estado = estadoAntes;
        compra.historialCambios = historialAntes;
        await this.#revertirMutacion(
          error,
          [
            () => this.eventoRepository.save(compra.evento),
            () => this.compraRepository.save(compra),
          ],
          'No se pudo completar la cancelación de forma consistente'
        );
      }
    });
  }

  async marcarUtilizada(compraId, quien = 'Acreditación en Puerta') {
    return this.#serializarMutacion(async () => {
      const compra = await this.obtenerPorId(compraId);
      const estadoAntes = compra.estado;
      const historialAntes = [...compra.historialCambios];
      compra.marcarComoUtilizada(quien);
      try {
        return await this.compraRepository.save(compra);
      } catch (error) {
        compra.estado = estadoAntes;
        compra.historialCambios = historialAntes;
        await this.#revertirMutacion(
          error,
          [() => this.compraRepository.save(compra)],
          'No se pudo completar la acreditación de forma consistente'
        );
      }
    });
  }

  async calificarCompra(compraId, { puntuacion, comentario }) {
    return this.#serializarMutacion(async () => {
      const compra = await this.obtenerPorId(compraId);

      if (compra.estado !== EstadoCompra.UTILIZADA) {
        throw new BusinessRuleError(
          'Solo se puede calificar un evento cuya entrada haya sido UTILIZADA',
          'CALIFICACION_NO_PERMITIDA'
        );
      }

      if (compra.reseniaRealizada) {
        throw new BusinessRuleError('Esta compra ya ha sido calificada', 'YA_CALIFICADA');
      }

      const resenia = new Resenia({
        comprador: compra.comprador,
        eventoId: compra.evento.id,
        puntuacion: Number(puntuacion),
        detalle: comentario,
      });
      const reseniasAntes = [...compra.evento.resenias];
      const reseniaRealizadaAntes = compra.reseniaRealizada;

      try {
        compra.evento.agregarResenia(resenia);
        await this.eventoRepository.save(compra.evento);
        compra.reseniaRealizada = true;
        await this.compraRepository.save(compra);
        return compra;
      } catch (error) {
        compra.evento.resenias = reseniasAntes;
        compra.reseniaRealizada = reseniaRealizadaAntes;
        await this.#revertirMutacion(
          error,
          [
            () => this.eventoRepository.save(compra.evento),
            () => this.compraRepository.save(compra),
          ],
          'No se pudo completar la calificación de forma consistente'
        );
      }
    });

  }
}

export const compraService = new CompraService();
