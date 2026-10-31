export class Usuario {
  constructor({
    id,
    nombre,
    apellido,
    rol = 'comprador',
    email = '',
    avatar = '',
    favoritos = [],
    rating = 5.0,
    totalResenias = 0,
  }) {
    if (!id || !nombre) {
      throw new Error('Usuario requiere id y nombre válidos');
    }
    this.id = id;
    this.nombre = nombre;
    this.apellido = apellido || '';
    this.rol = rol; // 'comprador' | 'organizador'
    this.email = email;
    this.avatar = avatar;
    this.favoritos = Array.isArray(favoritos) ? favoritos : [];
    this.rating = Number(rating) || 5.0;
    this.totalResenias = Number(totalResenias) || 0;
  }

  get nombreCompleto() {
    return `${this.nombre} ${this.apellido}`.trim();
  }

  esOrganizador() {
    return this.rol === 'organizador';
  }

  agregarFavorito(eventoId) {
    if (!this.favoritos.includes(eventoId)) {
      this.favoritos.push(eventoId);
    }
  }

  removerFavorito(eventoId) {
    this.favoritos = this.favoritos.filter((id) => id !== eventoId);
  }

  tieneFavorito(eventoId) {
    return this.favoritos.includes(eventoId);
  }
}
