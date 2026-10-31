import { usuarioRepository } from '../repositories/inMemory/UsuarioRepository.js';
import { eventoRepository } from '../repositories/inMemory/EventoRepository.js';

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
