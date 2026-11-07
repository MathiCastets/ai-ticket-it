import { compraService } from '../services/CompraService.js';
import { mensajeService } from '../services/MensajeService.js';
import { ValidationError } from './errors/ValidationError.js';
import { ForbiddenError } from '../services/errors/index.js';

const serializarCompra = (compra) =>
  typeof compra?.toJSON === 'function' ? compra.toJSON() : compra;

export class CompraController {
  constructor(
    _compraService = compraService,
    _mensajeService = mensajeService
  ) {
    this.compraService = _compraService;
    this.mensajeService = _mensajeService;
  }

  getAll = async (req, res, next) => {
    try {
      const { compradorId, eventoId } = req.query;
      if (compradorId && eventoId) {
        throw new ValidationError('Usá compradorId o eventoId, no ambos a la vez');
      }
      if (
        (compradorId && typeof compradorId !== 'string') ||
        (eventoId && typeof eventoId !== 'string')
      ) {
        throw new ValidationError('Los filtros de compra deben ser valores únicos de texto');
      }

      const actor = req.user;
      let compras;

      if (actor && actor.rol === 'comprador') {
        if (compradorId && compradorId !== actor.id) {
          throw new ForbiddenError('No tienes permiso para ver compras de otros usuarios');
        }
        if (eventoId) {
          throw new ForbiddenError('Solo el organizador puede consultar las compras del evento');
        }
        compras = await this.compraService.listarPorComprador(actor.id);
      } else if (actor && actor.rol === 'organizador') {
        if (compradorId && compradorId !== actor.id) {
          throw new ForbiddenError('No tienes permiso para ver compras de otros usuarios');
        }
        if (eventoId) {
          const todas = await this.compraService.listarPorEvento(eventoId);
          compras = todas.filter((c) => c.evento?.organizador?.id === actor.id);
        } else {
          compras = await this.compraService.listarPorOrganizador(actor.id);
        }
      } else {
        if (compradorId) {
          compras = await this.compraService.listarPorComprador(compradorId);
        } else if (eventoId) {
          compras = await this.compraService.listarPorEvento(eventoId);
        } else {
          compras = await this.compraService.listarTodas();
        }
      }

      res.status(200).json({ data: compras.map(serializarCompra) });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const compra = await this.compraService.obtenerPorId(id);
      const actor = req.user;
      if (actor) {
        const esDuenio = compra.comprador?.id === actor.id;
        const organizadorId = compra.evento?.organizador?.id || compra.evento?.organizadorId;
        const esOrganizador = organizadorId === actor.id;
        if (!esDuenio && !esOrganizador) {
          throw new ForbiddenError('No tienes permiso para ver esta compra');
        }
      }
      res.status(200).json({ data: serializarCompra(compra) });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const { compradorId, eventoId, tipoEntradaId, cantidad } = req.body;
      const actor = req.user;

      if (actor && actor.rol !== 'comprador') {
        throw new ForbiddenError('Solo los compradores pueden realizar compras');
      }
      if (actor && compradorId && compradorId !== actor.id) {
        throw new ForbiddenError('No puedes realizar compras en nombre de otro usuario');
      }

      const compradorIdFinal = compradorId || actor?.id;

      if (typeof compradorIdFinal !== 'string' || !compradorIdFinal.trim()) {
        throw new ValidationError('compradorId es requerido');
      }
      if (!eventoId) throw new ValidationError('eventoId es requerido');
      if (!tipoEntradaId) throw new ValidationError('tipoEntradaId es requerido');
      if (typeof cantidad !== 'number' || !Number.isSafeInteger(cantidad) || cantidad <= 0) {
        throw new ValidationError('cantidad debe ser un número entero positivo');
      }

      const compra = await this.compraService.realizarCompra({
        compradorId: compradorIdFinal,
        eventoId,
        tipoEntradaId,
        cantidad,
      });

      res.status(201).json({ data: serializarCompra(compra) });
    } catch (error) {
      next(error);
    }
  };

  cancel = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { quien } = req.body;
      if (quien !== undefined && (typeof quien !== 'string' || !quien.trim())) {
        throw new ValidationError('quien debe ser un texto no vacío');
      }
      const actor = req.user;
      const compraCancelada = await this.compraService.cancelarCompra(
        id,
        actor || quien || 'Comprador',
        quien
      );
      res.status(200).json({
        data: serializarCompra(compraCancelada),
        message: 'Compra cancelada y reembolsada exitosamente',
      });
    } catch (error) {
      next(error);
    }
  };

  markUsed = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { quien } = req.body;
      if (quien !== undefined && (typeof quien !== 'string' || !quien.trim())) {
        throw new ValidationError('quien debe ser un texto no vacío');
      }
      const actor = req.user;
      const compraUtilizada = await this.compraService.marcarUtilizada(
        id,
        actor || quien || 'Acreditación en Puerta',
        quien
      );
      res.status(200).json({
        data: serializarCompra(compraUtilizada),
        message: 'Entrada acreditada y marcada como UTILIZADA',
      });
    } catch (error) {
      next(error);
    }
  };

  rate = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { puntuacion, comentario } = req.body;

      if (
        typeof puntuacion !== 'number' ||
        !Number.isInteger(puntuacion * 2) ||
        puntuacion < 0.5 ||
        puntuacion > 5
      ) {
        throw new ValidationError('La puntuación debe estar entre 0.5 y 5 en incrementos de 0.5');
      }
      if (typeof comentario !== 'string' || !comentario.trim()) {
        throw new ValidationError('El comentario es requerido');
      }
      if (comentario.length > 250) {
        throw new ValidationError('El comentario no puede superar los 250 caracteres');
      }

      const actor = req.user;
      const compraCalificada = await this.compraService.calificarCompra(
        id,
        {
          puntuacion,
          comentario,
        },
        actor
      );

      res.status(200).json({
        data: serializarCompra(compraCalificada),
        message: 'Reseña registrada con éxito',
      });
    } catch (error) {
      next(error);
    }
  };

  sendMessage = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { usuarioId, texto } = req.body;
      const actor = req.user;

      if (actor && usuarioId && usuarioId !== actor.id) {
        throw new ForbiddenError('No puedes enviar mensajes en nombre de otro usuario');
      }

      const finalUsuarioId = usuarioId || actor?.id;

      if (typeof texto !== 'string' || !texto.trim()) {
        throw new ValidationError('El texto del mensaje no puede estar vacío');
      }
      if (!finalUsuarioId) {
        throw new ValidationError('usuarioId es requerido para enviar un mensaje');
      }

      const mensaje = await this.mensajeService.enviarMensaje(id, { usuarioId: finalUsuarioId, texto });

      res.status(201).json({ data: typeof mensaje?.toJSON === 'function' ? mensaje.toJSON() : mensaje });
    } catch (error) {
      next(error);
    }
  };

  getMessages = async (req, res, next) => {
    try {
      const { id } = req.params;
      const actor = req.user;
      if (actor) {
        const compra = await this.compraService.obtenerPorId(id);
        const esDuenio = compra.comprador?.id === actor.id;
        const organizadorId = compra.evento?.organizador?.id || compra.evento?.organizadorId;
        const esOrganizador = organizadorId === actor.id;
        if (!esDuenio && !esOrganizador) {
          throw new ForbiddenError('No tienes permiso para ver los mensajes de esta compra');
        }
      }
      const mensajes = await this.mensajeService.obtenerMensajes(id);
      res.status(200).json({ data: mensajes });
    } catch (error) {
      next(error);
    }
  };

  markMessagesRead = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { usuarioId } = req.body;
      const actor = req.user;

      if (actor && usuarioId && usuarioId !== actor.id) {
        throw new ForbiddenError('No puedes marcar mensajes leídos en nombre de otro usuario');
      }

      const finalUsuarioId = usuarioId || actor?.id;

      if (typeof finalUsuarioId !== 'string' || !finalUsuarioId.trim()) {
        throw new ValidationError('usuarioId es requerido para marcar los mensajes como leídos');
      }

      const mensajes = await this.mensajeService.marcarMensajesLeidos(id, finalUsuarioId);
      res.status(200).json({ data: mensajes });
    } catch (error) {
      next(error);
    }
  };
}

export const compraController = new CompraController();
