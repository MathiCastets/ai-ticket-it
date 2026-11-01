import { usuarioRepository } from '../repositories/inMemory/UsuarioRepository.js';
import { eventoRepository } from '../repositories/inMemory/EventoRepository.js';
import { BusinessRuleError } from './errors/index.js';

export class UsuarioService {
  constructor(
    _usuarioRepository = usuarioRepository,
    _eventoRepository = eventoRepository
  ) {
    this.usuarioRepository = _usuarioRepository;
    this.eventoRepository = _eventoRepository;
  }

  async obtenerFavoritos(usuarioId) {
    const usuario = await this.usuarioRepository.findById(usuarioId);
    return [...usuario.favoritos];
  }

  async listarUsuarios() {
    const usuarios = await this.usuarioRepository.findAll();
    return usuarios.map(
      ({ id, nombre, apellido, rol, avatar, favoritos, rating, totalResenias }) => ({
        id,
        nombre,
        apellido,
        rol,
        avatar,
        favoritos: [...favoritos],
        rating,
        totalResenias,
      })
    );
  }

  async obtenerResenias(organizadorId, { page = 1, limit = 5 } = {}) {
    const organizador = await this.usuarioRepository.findById(organizadorId);
    if (!organizador.esOrganizador()) {
      throw new BusinessRuleError('Las reseñas solo están disponibles para organizadores');
    }

    const eventos = await this.eventoRepository.findAll();
    const resenias = eventos
      .filter((evento) => evento.organizador?.id === organizadorId)
      .flatMap((evento) =>
        evento.resenias.map((resenia) => ({
          id: resenia.id,
          eventoId: evento.id,
          eventoNombre: evento.nombre,
          comprador: {
            nombre: resenia.comprador?.nombre || '',
            apellido: resenia.comprador?.apellido || '',
          },
          detalle: resenia.detalle,
          puntuacion: resenia.puntuacion,
          fechaHora: resenia.fechaHora,
        }))
      )
      .sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
    const offset = (page - 1) * limit;

    return {
      resenias: resenias.slice(offset, offset + limit),
      total: resenias.length,
      page,
      limit,
      totalPages: Math.ceil(resenias.length / limit),
      promedio:
        resenias.length > 0
          ? Number(
              (
                resenias.reduce((suma, resenia) => suma + resenia.puntuacion, 0) /
                resenias.length
              ).toFixed(1)
            )
          : null,
    };
  }

  async agregarFavorito(usuarioId, eventoId) {
    const usuario = await this.usuarioRepository.findById(usuarioId);
    await this.eventoRepository.findById(eventoId);
    const favoritosAntes = [...usuario.favoritos];
    usuario.agregarFavorito(eventoId);
    try {
      await this.usuarioRepository.save(usuario);
    } catch (error) {
      usuario.favoritos = favoritosAntes;
      throw error;
    }
    return [...usuario.favoritos];
  }

  async removerFavorito(usuarioId, eventoId) {
    const usuario = await this.usuarioRepository.findById(usuarioId);
    await this.eventoRepository.findById(eventoId);
    const favoritosAntes = [...usuario.favoritos];
    usuario.removerFavorito(eventoId);
    try {
      await this.usuarioRepository.save(usuario);
    } catch (error) {
      usuario.favoritos = favoritosAntes;
      throw error;
    }
    return [...usuario.favoritos];
  }
}

export const usuarioService = new UsuarioService();
