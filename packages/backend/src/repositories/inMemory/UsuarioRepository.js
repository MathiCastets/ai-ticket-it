import { seedData } from '../seedData.js';
import { EntityNotFoundError } from '../errors/EntityNotFoundError.js';

class UsuarioRepository {
  constructor(seed = null) {
    this.usuarios = seed || seedData.usuarios;
  }

  async findAll() {
    return [...this.usuarios];
  }

  async findById(id) {
    const usuario = this.usuarios.find((u) => u.id === id);
    if (!usuario) {
      throw new EntityNotFoundError('Usuario', id);
    }
    return usuario;
  }

  async findByEmail(email) {
    return this.usuarios.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async save(usuario) {
    const existingIndex = this.usuarios.findIndex((u) => u.id === usuario.id);
    if (existingIndex >= 0) {
      this.usuarios[existingIndex] = usuario;
    } else {
      this.usuarios.push(usuario);
    }
    return usuario;
  }
}

export const usuarioRepository = new UsuarioRepository();
export { UsuarioRepository };
