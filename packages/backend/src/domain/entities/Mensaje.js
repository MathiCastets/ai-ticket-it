export class Mensaje {
  constructor({
    id,
    usuario,   // Usuario (referencia directa, según diagrama de clases)
    mensaje,   // String (nombre del campo según diagrama)
    enviado = null,
    leidoPor = [],
  }) {
    if (!mensaje || !String(mensaje).trim()) {
      throw new Error('Mensaje no puede estar vacío');
    }
    if (!usuario) throw new Error('Mensaje requiere un usuario (Usuario)');

    this.id      = id || `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.usuario = usuario;
    this.mensaje = String(mensaje).trim();
    this.enviado = enviado ? new Date(enviado) : new Date();
    this.leidoPor = Array.isArray(leidoPor) ? [...leidoPor] : [];
  }

  get fechaHoraFormateada() {
    return this.enviado.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  toJSON() {
    let usuarioJson = this.usuario;
    if (typeof this.usuario?.toJSON === 'function') {
      usuarioJson = this.usuario.toJSON();
    } else if (typeof this.usuario === 'object' && this.usuario !== null) {
      const { email: _email, ...resto } = this.usuario;
      usuarioJson = resto;
    }

    return {
      id: this.id,
      usuario: usuarioJson,
      usuarioId: typeof this.usuario === 'object' && this.usuario !== null ? this.usuario.id : this.usuario,
      usuarioNombre:
        typeof this.usuario === 'object' && this.usuario !== null
          ? this.usuario.nombreCompleto || this.usuario.nombre
          : '',
      mensaje: this.mensaje,
      texto: this.mensaje,
      enviado: this.enviado,
      leidoPor: [...this.leidoPor],
      fechaHoraFormateada: this.fechaHoraFormateada,
    };
  }
}
