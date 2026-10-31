import { Evento } from '../domain/entities/Evento.js';
import { TipoEntrada } from '../domain/entities/TipoEntrada.js';
import { eventoRepository } from '../repositories/inMemory/EventoRepository.js';
import { usuarioRepository } from '../repositories/inMemory/UsuarioRepository.js';
import { categoriaRepository } from '../repositories/inMemory/CategoriaRepository.js';
import { EntityNotFoundError } from '../repositories/errors/EntityNotFoundError.js';
import { ResourceNotFoundError, BusinessRuleError } from './errors/index.js';
import { compraService } from './CompraService.js';
import { randomUUID } from 'node:crypto';

export class EventoService {
  constructor(
    _eventoRepository = eventoRepository,
    _usuarioRepository = usuarioRepository,
    _categoriaRepository = categoriaRepository,
    _compraService = compraService
  ) {
    this.eventoRepository    = _eventoRepository;
    this.usuarioRepository   = _usuarioRepository;
    this.categoriaRepository = _categoriaRepository;
    this.compraService       = _compraService;
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

  async crearEvento({ nombre, fecha, organizadorId, categoriaId, tiposEntrada, ...resto }) {
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

    const evento = new Evento({
      ...resto,
      nombre: nombre.trim(),
      fecha: fechaEvento,
      id: `evt-${randomUUID()}`,
      organizador,
      categoria,
      tiposEntrada: tipos,
    });

    return await this.eventoRepository.save(evento);
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
