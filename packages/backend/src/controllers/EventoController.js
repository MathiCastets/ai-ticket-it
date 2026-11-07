import { eventoService } from '../services/EventoService.js';
import { ValidationError } from './errors/ValidationError.js';

const obtenerResumenesOrganizadores = (eventos) => {
  const resumenes = new Map();
  for (const evento of eventos) {
    const organizadorId = evento.organizador?.id || evento.organizadorId;
    if (!organizadorId) continue;

    const resumen = resumenes.get(organizadorId) || { suma: 0, total: 0 };
    for (const resenia of evento.resenias || []) {
      const puntuacion = Number(resenia.puntuacion);
      if (!Number.isFinite(puntuacion)) continue;
      resumen.suma += puntuacion;
      resumen.total += 1;
    }
    resumenes.set(organizadorId, resumen);
  }

  return resumenes;
};

const serializarEventoSinResenias = (evento, resumenes) => {
  const serializado = typeof evento.toJSON === 'function' ? evento.toJSON() : evento;
  const organizadorId = serializado.organizador?.id || serializado.organizadorId;
  const resumen = resumenes.get(organizadorId);
  const totalResenias = resumen?.total || 0;
  return {
    ...serializado,
    organizadorRating:
      totalResenias > 0 ? Number((resumen.suma / totalResenias).toFixed(1)) : null,
    totalResenias,
    resenias: [],
  };
};

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
      const [eventos, todosLosEventos] = await Promise.all([
        this.eventoService.listarEventos({ categoria, search, sortBy }),
        this.eventoService.listarEventos(),
      ]);
      const resumenes = obtenerResumenesOrganizadores(todosLosEventos);
      const eventosSerializados = eventos.map((evento) =>
        serializarEventoSinResenias(evento, resumenes)
      );
      if (sortBy === 'rating') {
        eventosSerializados.sort(
          (a, b) => (b.organizadorRating ?? -1) - (a.organizadorRating ?? -1)
        );
      }
      res.status(200).json({ data: eventosSerializados });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const evento = await this.eventoService.obtenerPorId(id);
      const todosLosEventos = await this.eventoService.listarEventos();
      const resumenes = obtenerResumenesOrganizadores(todosLosEventos);
      res.status(200).json({ data: serializarEventoSinResenias(evento, resumenes) });
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

  update = async (req, res, next) => {
    try {
      let payload = req.body;
      if (req.is('multipart/form-data')) {
        try {
          payload = JSON.parse(req.body.cambios);
        } catch {
          throw new ValidationError('El campo cambios debe contener un objeto JSON válido');
        }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
          throw new ValidationError('El campo cambios debe contener un objeto JSON');
        }
      }

      const {
        organizadorId,
        nombre,
        descripcion,
        ubicacion,
        direccion,
        imagen,
        fecha,
      } = payload;
      if (typeof organizadorId !== 'string' || !organizadorId.trim()) {
        throw new ValidationError('organizadorId es requerido para modificar el evento');
      }

      const evento = await this.eventoService.actualizarEvento(req.params.id, {
        organizadorId,
        nombre,
        descripcion,
        ubicacion,
        direccion,
        imagen,
        fecha,
        imagenes: req.files || [],
      });
      res.status(200).json({ data: evento });
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
        !Number.isInteger(puntuacion * 2) ||
        puntuacion < 0.5 ||
        puntuacion > 5
      ) {
        throw new ValidationError('La puntuación debe estar entre 0.5 y 5 en incrementos de 0.5');
      }
      if (typeof detalle !== 'string' || !detalle.trim()) {
        throw new ValidationError('El comentario de la reseña es requerido');
      }
      if (detalle.length > 250) {
        throw new ValidationError('El comentario no puede superar los 250 caracteres');
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
