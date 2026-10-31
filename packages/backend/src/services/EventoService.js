import { Evento } from '../domain/entities/Evento.js';
import { TipoEntrada } from '../domain/entities/TipoEntrada.js';
import { eventoRepository } from '../repositories/inMemory/EventoRepository.js';
import { usuarioRepository } from '../repositories/inMemory/UsuarioRepository.js';
import { categoriaRepository } from '../repositories/inMemory/CategoriaRepository.js';
import { EntityNotFoundError } from '../repositories/errors/EntityNotFoundError.js';
import { ResourceNotFoundError, BusinessRuleError } from './errors/index.js';
import { compraService } from './CompraService.js';
import { eventoImageStorage } from './EventoImageStorage.js';
import { randomUUID } from 'node:crypto';

export class EventoService {
  constructor(
    _eventoRepository = eventoRepository,
    _usuarioRepository = usuarioRepository,
    _categoriaRepository = categoriaRepository,
    _compraService = compraService,
    _eventoImageStorage = eventoImageStorage
  ) {
    this.eventoRepository    = _eventoRepository;
    this.usuarioRepository   = _usuarioRepository;
    this.categoriaRepository = _categoriaRepository;
    this.compraService       = _compraService;
    this.eventoImageStorage  = _eventoImageStorage;
  }

  async listarEventos(filtros = {}) {
    return await this.eventoRepository.findAll(filtros);
  }

  async obtenerPorId(id) {
    try {
      return await this.eventoRepository.findById(id);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new ResourceNotFoundError('Evento', id);
      }
      throw error;
    }
  }

  async actualizarEvento(
    id,
    {
      organizadorId,
      nombre,
      descripcion,
      ubicacion,
      direccion,
      imagen,
      fecha,
      fechaTexto,
      imagenes = [],
    }
  ) {
    const evento = await this.obtenerPorId(id);
    if (evento.organizador?.id !== organizadorId) {
      throw new BusinessRuleError(
        'Solo el organizador del evento puede modificarlo',
        'ORGANIZADOR_EVENTO_INVALIDO'
      );
    }

    if (nombre !== undefined && (typeof nombre !== 'string' || !nombre.trim())) {
      throw new BusinessRuleError('El nombre del evento no puede estar vacío');
    }
    for (const [field, value] of Object.entries({ descripcion, ubicacion, direccion })) {
      if (value !== undefined && typeof value !== 'string') {
        throw new BusinessRuleError(`${field} debe ser un texto`);
      }
    }
    if (imagen !== undefined && typeof imagen !== 'string') {
      throw new BusinessRuleError('La imagen del evento no es válida');
    }
    if (fecha !== undefined) {
      const nuevaFecha = new Date(fecha);
      if (typeof fecha !== 'string' || Number.isNaN(nuevaFecha.getTime())) {
        throw new BusinessRuleError('La fecha del evento no es válida');
      }
      if (nuevaFecha.getTime() <= Date.now()) {
        throw new BusinessRuleError('La fecha y hora del evento deben ser posteriores al momento actual.');
      }
    }
    if (fechaTexto !== undefined && typeof fechaTexto !== 'string') {
      throw new BusinessRuleError('La fecha formateada debe ser un texto');
    }
    if (!Array.isArray(imagenes) || imagenes.length > 1) {
      throw new BusinessRuleError('Cada evento puede tener una sola imagen');
    }

    const previousValues = {
      nombre: evento.nombre,
      descripcion: evento.descripcion,
      ubicacion: evento.ubicacion,
      direccion: evento.direccion,
      fecha: evento.fecha,
      fechaTexto: evento.fechaTexto,
      imagen: evento.imagen,
      multimedia: evento.multimedia,
    };
    const imagenesAnteriores = [
      ...new Set([evento.imagen, ...(evento.multimedia || [])].filter((path) => path?.startsWith('/uploads/'))),
    ];

    const imagenesSubidas = imagenes.length ? await this.eventoImageStorage.guardar(imagenes) : [];
    if (nombre !== undefined) evento.nombre = nombre.trim();
    if (descripcion !== undefined) evento.descripcion = descripcion.trim();
    if (ubicacion !== undefined) evento.ubicacion = ubicacion.trim();
    if (direccion !== undefined) evento.direccion = direccion.trim();
    if (fecha !== undefined) evento.fecha = new Date(fecha);
    if (fechaTexto !== undefined) evento.fechaTexto = fechaTexto.trim();
    if (imagenesSubidas.length) {
      evento.imagen = imagenesSubidas[0];
      evento.multimedia = imagenesSubidas;
    } else if (imagen !== undefined) {
      evento.imagen = imagen.trim();
      evento.multimedia = evento.imagen ? [evento.imagen] : [];
    }

    try {
      const eventoGuardado = await this.eventoRepository.save(evento);
      const imagenesAEliminar = imagenesAnteriores.filter(
        (path) => !evento.multimedia.includes(path)
      );
      if (imagenesAEliminar.length) {
        try {
          await this.eventoImageStorage.eliminar(imagenesAEliminar);
        } catch (cleanupError) {
          console.error('[EventoService] No se pudieron limpiar imágenes reemplazadas:', cleanupError);
        }
      }
      return eventoGuardado;
    } catch (error) {
      Object.assign(evento, previousValues);
      if (imagenesSubidas.length) {
        try {
          await this.eventoImageStorage.eliminar(imagenesSubidas);
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            'No se pudieron guardar los cambios ni limpiar la imagen cargada.'
          );
        }
      }
      throw error;
    }
  }

  async crearEvento({
    nombre,
    fecha,
    organizadorId,
    categoriaId,
    tiposEntrada,
    imagenes = [],
    multimedia = [],
    imagen = '',
    ...resto
  }) {
    if (!Array.isArray(imagenes) || !Array.isArray(multimedia)) {
      throw new BusinessRuleError('La imagen del evento no es válida');
    }
    const imagenAdicional =
      typeof imagen === 'string' && imagen.trim() && !multimedia.includes(imagen) ? 1 : 0;
    if (imagenes.length + multimedia.length + imagenAdicional > 1) {
      throw new BusinessRuleError('Cada evento puede tener una sola imagen');
    }

    if (typeof nombre !== 'string' || !nombre.trim()) {
      throw new BusinessRuleError('El evento debe tener al menos nombre y fecha');
    }
    const fechaEvento = new Date(fecha);
    if (!fecha || Number.isNaN(fechaEvento.getTime())) {
      throw new BusinessRuleError('La fecha del evento no es válida');
    }
    if (!Array.isArray(tiposEntrada) || tiposEntrada.length === 0) {
      throw new BusinessRuleError('El evento debe ofrecer al menos un tipo de entrada con su precio y cupo');
    }

    // Resolver organizador como entidad Usuario
    let organizador;
    try {
      organizador = await this.usuarioRepository.findById(organizadorId);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new ResourceNotFoundError('Usuario (organizador)', organizadorId);
      }
      throw error;
    }
    if (!organizador.esOrganizador()) {
      throw new BusinessRuleError('El usuario indicado no tiene rol de organizador', 'ORGANIZADOR_INVALIDO');
    }

    const categoriaReferencia = categoriaId || resto.categoria;
    let categoria = null;
    if (typeof categoriaReferencia === 'string' && categoriaReferencia.trim()) {
      try {
        categoria = await this.categoriaRepository.findById(categoriaReferencia);
      } catch (error) {
        if (!(error instanceof EntityNotFoundError)) throw error;
      }
      if (!categoria) {
        try {
          categoria = await this.categoriaRepository.findByNombre(categoriaReferencia.trim());
        } catch (error) {
          if (!(error instanceof EntityNotFoundError)) throw error;
        }
      }
    }
    if (!categoria) {
      throw new ResourceNotFoundError('Categoria', categoriaReferencia || '(sin categoría)');
    }

    const tipos = tiposEntrada.map((t, index) => {
      if (!t || typeof t !== 'object' || Array.isArray(t)) {
        throw new BusinessRuleError(`Tipo de entrada #${index + 1} debe ser un objeto`);
      }
      const precio = t.precio;
      const cupo = t.cupo;
      if (typeof t.nombre !== 'string' || !t.nombre.trim()) {
        throw new BusinessRuleError(`Tipo de entrada #${index + 1} requiere un nombre`);
      }
      if (typeof precio !== 'number' || !Number.isFinite(precio) || precio < 0) {
        throw new BusinessRuleError(`El precio del tipo de entrada #${index + 1} debe ser válido y no negativo`);
      }
      if (!Number.isSafeInteger(cupo) || cupo <= 0) {
        throw new BusinessRuleError(`El cupo del tipo de entrada #${index + 1} debe ser un entero positivo`);
      }
      return new TipoEntrada({
        id: t.id || `te-${randomUUID()}`,
        nombre: t.nombre.trim(),
        descripcion: t.descripcion || '',
        precio,
        cupo,
        disponibles: cupo,
      });
    });
    const idsTipoEntrada = tipos.map((tipo) => tipo.id);
    if (new Set(idsTipoEntrada).size !== idsTipoEntrada.length) {
      throw new BusinessRuleError('Los tipos de entrada del evento deben tener ids únicos');
    }

    const uploadedImages = imagenes.length
      ? await this.eventoImageStorage.guardar(imagenes)
      : [];
    try {
      const eventImages = [...uploadedImages, ...(Array.isArray(multimedia) ? multimedia : [])];
      const evento = new Evento({
        ...resto,
        nombre: nombre.trim(),
        fecha: fechaEvento,
        id: `evt-${randomUUID()}`,
        organizador,
        categoria,
        multimedia: eventImages,
        imagen: imagen || eventImages[0] || '',
        tiposEntrada: tipos,
      });

      return await this.eventoRepository.save(evento);
    } catch (error) {
      if (uploadedImages.length) {
        await this.eventoImageStorage.eliminar(uploadedImages);
      }
      throw error;
    }
  }

  async agregarResenia(eventoId, { compraId, puntuacion, detalle }) {
    const evento = await this.obtenerPorId(eventoId);
    const compra = await this.compraService.obtenerPorId(compraId);

    if (compra.evento.id !== evento.id) {
      throw new BusinessRuleError('La compra no pertenece al evento indicado', 'COMPRA_EVENTO_NO_COINCIDE');
    }

    const compraCalificada = await this.compraService.calificarCompra(compraId, {
      puntuacion,
      comentario: detalle,
    });

    return compraCalificada.evento.resenias[0];
  }
}

export const eventoService = new EventoService();
