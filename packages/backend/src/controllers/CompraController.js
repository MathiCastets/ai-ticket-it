import { compraService } from '../services/CompraService.js';
import { mensajeService } from '../services/MensajeService.js';
import { ValidationError } from './errors/ValidationError.js';

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
      let compras;
      if (compradorId) {
        compras = await this.compraService.listarPorComprador(compradorId);
      } else if (eventoId) {
        compras = await this.compraService.listarPorEvento(eventoId);
      } else {
        compras = await this.compraService.listarTodas();
      }
      res.status(200).json({ data: compras });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const compra = await this.compraService.obtenerPorId(id);
      res.status(200).json({ data: compra });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      const { compradorId, eventoId, tipoEntradaId, cantidad } = req.body;

      if (typeof compradorId !== 'string' || !compradorId.trim()) {
        throw new ValidationError('compradorId es requerido');
      }
      if (!eventoId) throw new ValidationError('eventoId es requerido');
      if (!tipoEntradaId) throw new ValidationError('tipoEntradaId es requerido');
      if (typeof cantidad !== 'number' || !Number.isSafeInteger(cantidad) || cantidad <= 0) {
        throw new ValidationError('cantidad debe ser un número entero positivo');
      }

      const compra = await this.compraService.realizarCompra({
        compradorId,
        eventoId,
        tipoEntradaId,
        cantidad,
      });

      res.status(201).json({ data: compra });
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
      const compraCancelada = await this.compraService.cancelarCompra(id, quien || 'Comprador');
      res.status(200).json({
        data: compraCancelada,
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
      const compraUtilizada = await this.compraService.marcarUtilizada(id, quien || 'Acreditación en Puerta');
      res.status(200).json({
        data: compraUtilizada,
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
        !Number.isInteger(puntuacion) ||
        puntuacion < 1 ||
        puntuacion > 5
      ) {
        throw new ValidationError('La puntuación debe ser un número entero entre 1 y 5');
      }
      if (typeof comentario !== 'string' || !comentario.trim()) {
        throw new ValidationError('El comentario es requerido');
      }

      const compraCalificada = await this.compraService.calificarCompra(id, {
        puntuacion,
        comentario,
      });

      res.status(200).json({
        data: compraCalificada,
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

      if (typeof texto !== 'string' || !texto.trim()) {
        throw new ValidationError('El texto del mensaje no puede estar vacío');
      }
      if (!usuarioId) {
        throw new ValidationError('usuarioId es requerido para enviar un mensaje');
      }

      const mensaje = await this.mensajeService.enviarMensaje(id, { usuarioId, texto });

      res.status(201).json({ data: mensaje });
    } catch (error) {
      next(error);
    }
  };

  getMessages = async (req, res, next) => {
    try {
      const { id } = req.params;
      const mensajes = await this.mensajeService.obtenerMensajes(id);
      res.status(200).json({ data: mensajes });
    } catch (error) {
      next(error);
    }
  };
}

export const compraController = new CompraController();
