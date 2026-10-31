import { eventoService } from '../services/EventoService.js';
import { ValidationError } from './errors/ValidationError.js';

export class EventoController {
  constructor(_eventoService = eventoService) {
    this.eventoService = _eventoService;
  }

  getAll = async (req, res, next) => {
    try {
      const { categoria, search, sortBy } = req.query;
      if (
        (categoria !== undefined && typeof categoria !== 'string') ||
        (search !== undefined && typeof search !== 'string') ||
        (sortBy !== undefined && typeof sortBy !== 'string')
      ) {
        throw new ValidationError('Los filtros de eventos deben ser valores únicos de texto');
      }
      if (sortBy && !['fecha', 'precio', 'rating'].includes(sortBy)) {
        throw new ValidationError('sortBy debe ser fecha, precio o rating');
      }
      const eventos = await this.eventoService.listarEventos({ categoria, search, sortBy });
      res.status(200).json({ data: eventos });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const evento = await this.eventoService.obtenerPorId(id);
      res.status(200).json({ data: evento });
    } catch (error) {
      next(error);
    }
  };

  create = async (req, res, next) => {
    try {
      let payload = req.body;
      if (req.is('multipart/form-data')) {
        try {
          payload = JSON.parse(req.body.evento);
        } catch {
          throw new ValidationError('El campo evento debe contener un objeto JSON válido');
        }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          throw new ValidationError('El campo evento debe contener un objeto JSON');
        }
      }
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new ValidationError('El cuerpo de la solicitud debe ser un objeto JSON');
      }

      const { nombre, fecha, categoria, categoriaId, organizadorId, tiposEntrada } = payload;

      if (typeof nombre !== 'string' || !nombre.trim()) {
        throw new ValidationError('El nombre del evento es requerido');
      }
      if (!fecha) {
        throw new ValidationError('La fecha del evento es requerida');
      }
      if (typeof fecha !== 'string' || Number.isNaN(new Date(fecha).getTime())) {
        throw new ValidationError('La fecha del evento debe ser una fecha válida');
      }
      if (
        (typeof categoria !== 'string' || !categoria.trim()) &&
        (typeof categoriaId !== 'string' || !categoriaId.trim())
      ) {
        throw new ValidationError('La categoría del evento es requerida');
      }
      if (
        (categoria !== undefined && typeof categoria !== 'string') ||
        (categoriaId !== undefined && typeof categoriaId !== 'string')
      ) {
        throw new ValidationError('La categoría debe indicarse mediante un nombre o id de texto');
      }
      if (!organizadorId) {
        throw new ValidationError('organizadorId es requerido');
      }
      if (typeof organizadorId !== 'string' || !organizadorId.trim()) {
        throw new ValidationError('organizadorId debe ser un texto no vacío');
      }
      if (!Array.isArray(tiposEntrada) || tiposEntrada.length === 0) {
        throw new ValidationError('Debe incluir al menos un tipo de entrada con su precio y cupo');
      }

      const nuevoEvento = await this.eventoService.crearEvento({
        ...payload,
        imagenes: req.files || [],
      });
      res.status(201).json({ data: nuevoEvento });
    } catch (error) {
      next(error);
    }
  };

  addReview = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { compraId, puntuacion, detalle } = req.body;

      if (!compraId) {
        throw new ValidationError('compraId es requerido para verificar la entrada utilizada');
      }
      if (
        typeof puntuacion !== 'number' ||
        !Number.isInteger(puntuacion) ||
        puntuacion < 1 ||
        puntuacion > 5
      ) {
        throw new ValidationError('La puntuación debe ser un número entero entre 1 y 5');
      }
      if (typeof detalle !== 'string' || !detalle.trim()) {
        throw new ValidationError('El comentario de la reseña es requerido');
      }

      const resenia = await this.eventoService.agregarResenia(id, {
        compraId,
        puntuacion,
        detalle,
      });

      res.status(201).json({ data: resenia });
    } catch (error) {
      next(error);
    }
  };
}

export const eventoController = new EventoController();
