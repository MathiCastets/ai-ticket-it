import { Mensaje } from '../domain/entities/Mensaje.js';
import { compraRepository } from '../repositories/inMemory/CompraRepository.js';
import { usuarioRepository } from '../repositories/inMemory/UsuarioRepository.js';
import { EntityNotFoundError } from '../repositories/errors/EntityNotFoundError.js';
import { ResourceNotFoundError, BusinessRuleError } from './errors/index.js';

export class MensajeService {
  constructor(
    _compraRepository = compraRepository,
    _usuarioRepository = usuarioRepository
  ) {
    this.compraRepository  = _compraRepository;
    this.usuarioRepository = _usuarioRepository;
  }

  async enviarMensaje(compraId, { usuarioId, texto }) {
    if (typeof texto !== 'string' || !texto.trim()) {
      throw new BusinessRuleError('El texto del mensaje no puede estar vacío');
    }

    let compra;
    try {
      compra = await this.compraRepository.findById(compraId);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new ResourceNotFoundError('Compra', compraId);
      }
      throw error;
    }

    // Resolver Usuario emisor (entidad del dominio)
    let usuario;
    try {
      usuario = await this.usuarioRepository.findById(usuarioId);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new ResourceNotFoundError('Usuario', usuarioId);
      }
      throw error;
    }

    const organizadorId =
      typeof compra.evento.organizador === 'object'
        ? compra.evento.organizador?.id
        : compra.evento.organizadorId;
    if (usuario.id !== compra.comprador.id && usuario.id !== organizadorId) {
      throw new BusinessRuleError(
        'Solo el comprador y el organizador del evento pueden participar en este chat.',
        'MENSAJERO_NO_AUTORIZADO'
      );
    }

    if (compra.estaConversacionCerrada()) {
      throw new BusinessRuleError(
        'Esta conversación se encuentra cerrada.',
        'CONVERSACION_CERRADA'
      );
    }

    const mensaje = new Mensaje({ usuario, mensaje: texto });
    const mensajesAnteriores = [...compra.mensajes];
    compra.agregarMensaje(mensaje);
    try {
      await this.compraRepository.save(compra);
    } catch (error) {
      compra.mensajes = mensajesAnteriores;
      throw error;
    }
    return mensaje;
  }

  async obtenerMensajes(compraId) {
    try {
      const compra = await this.compraRepository.findById(compraId);
      return compra.mensajes || [];
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new ResourceNotFoundError('Compra', compraId);
      }
      throw error;
    }
  }

  async marcarMensajesLeidos(compraId, usuarioId) {
    let compra;
    try {
      compra = await this.compraRepository.findById(compraId);
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        throw new ResourceNotFoundError('Compra', compraId);
      }
      throw error;
    }

    const organizadorId =
      typeof compra.evento.organizador === 'object'
        ? compra.evento.organizador?.id
        : compra.evento.organizadorId;
    if (usuarioId !== compra.comprador.id && usuarioId !== organizadorId) {
      throw new BusinessRuleError(
        'Solo el comprador y el organizador del evento pueden leer este chat.',
        'LECTOR_NO_AUTORIZADO'
      );
    }

    const mensajesAnteriores = compra.mensajes.map((mensaje) => ({
      mensaje,
      leidoPor: [...(mensaje.leidoPor || [])],
    }));
    let huboCambios = false;
    for (const mensaje of compra.mensajes) {
      const emisorId = mensaje.usuario?.id || mensaje.usuarioId;
      if (emisorId !== usuarioId && !mensaje.leidoPor?.includes(usuarioId)) {
        mensaje.leidoPor = [...(mensaje.leidoPor || []), usuarioId];
        huboCambios = true;
      }
    }
    if (!huboCambios) return compra.mensajes;

    try {
      await this.compraRepository.save(compra);
      return compra.mensajes;
    } catch (error) {
      for (const { mensaje, leidoPor } of mensajesAnteriores) {
        mensaje.leidoPor = leidoPor;
      }
      throw error;
    }
  }
}

export const mensajeService = new MensajeService();
